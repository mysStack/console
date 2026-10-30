/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * V3 checks whether the springcloud component is installed before it renders a
 * project or cluster page, and that check blocks the first row. The probe is a
 * name-filtered customresourcedefinitions list served by ks-apiserver, which
 * costs 0.9–1.6 s on this test cluster even though it answers with an empty
 * list (34 bytes); the same request from the host realm costs the same, so the
 * delay is on the server side of that one query, not in V3's boot.
 *
 * V3 is served from the sealed `v3dist` bundle and the host cannot intercept an
 * iframe request, so the only host-side lever is to answer repeat probes from a
 * short-lived cache inside the sandbox. The check is read-only and cluster
 * scoped, and its answer only changes when the component is installed or
 * removed, so a five minute cache keeps behaviour and removes the wait from
 * every project switch after the first one.
 */
export const SPRINGCLOUD_PROBE_CACHE_TTL_MS = 300_000;
export const SPRINGCLOUD_CRD_NAME = 'configurations.springcloud.kubesphere.io';
/** Survives hard refresh so the first V3 probe does not wait on ks-apiserver. */
export const SPRINGCLOUD_PROBE_SESSION_KEY = '__KS_SPRINGCLOUD_PROBE_SEEDS_V1__';

const PROBE_CACHE_FLAG = '__KS_SPRINGCLOUD_PROBE_CACHE__';
export const SPRINGCLOUD_PROBE_SEEDS_KEY = '__KS_SPRINGCLOUD_PROBE_SEEDS__';

type ProbeSessionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface SpringCloudProbeRecord {
  at: number;
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Runs as an inline script inside the Wujie sandbox before the V3 bundle, so
 * the very first probe is already covered. Plain ES5 on purpose: it is injected
 * as text, not compiled, and must not reference anything outside itself.
 */
export const SPRINGCLOUD_PROBE_CACHE_SOURCE = `(function (win) {
  if (!win || typeof win.fetch !== 'function' || win.${PROBE_CACHE_FLAG}) return;
  var TTL = ${SPRINGCLOUD_PROBE_CACHE_TTL_MS};
  var NAME = '${SPRINGCLOUD_CRD_NAME}';
  var original = win.fetch;
  var cache = {};
  win.${PROBE_CACHE_FLAG} = cache;

  function matches(input) {
    if (!input) return false;
    var url = typeof input === 'string' ? input : input.url || '';
    return url.indexOf('customresourcedefinitions') !== -1 && url.indexOf('name=' + NAME) !== -1;
  }

  function now() {
    return (win.Date || Date).now();
  }

  // The host starts the same query at bootstrap, in parallel with the V3
  // bundle load, and publishes the answer on its own window. Reading it here
  // turns the first probe of a page load into a local answer too; without a
  // fresh seed the probe still goes to the network as before.
  function seedFor(url) {
    var seeds = null;
    try {
      seeds = win.parent && win.parent['${SPRINGCLOUD_PROBE_SEEDS_KEY}'];
    } catch (e) {
      return null;
    }
    if (!seeds) return null;
    var matched = /\\/clusters\\/([^/?#]+)\\//.exec(url);
    var record = seeds[matched ? matched[1] : 'host'];
    if (!record || record.status < 200 || !record.body) return null;
    if (now() - record.at >= TTL) return null;
    return record;
  }

  function build(record) {
    if (!win.Response) return null;
    try {
      return new win.Response(record.body, {
        status: record.status,
        statusText: record.statusText,
        headers: record.headers,
      });
    } catch (e) {
      return null;
    }
  }

  win.fetch = function (input, init) {
    if (!matches(input)) return original.apply(win, arguments);
    var method = (init && init.method) || 'GET';
    if (String(method).toUpperCase() !== 'GET') return original.apply(win, arguments);
    var url = typeof input === 'string' ? input : input.url;
    var hit = cache[url];
    if (hit && now() - hit.at < TTL) {
      var rebuilt = build(hit);
      if (rebuilt) return Promise.resolve(rebuilt);
    }
    var seed = seedFor(url);
    if (seed) {
      cache[url] = seed;
      var seeded = build(seed);
      if (seeded) return Promise.resolve(seeded);
    }
    var inflight = cache['#' + url];
    if (!inflight) {
      inflight = original.apply(win, arguments).then(function (response) {
        if (!response || !response.clone || response.status < 200) {
          return { raw: response };
        }
        var headers = {};
        try {
          response.headers.forEach(function (value, key) {
            headers[key] = value;
          });
        } catch (e) {}
        return response.clone().text().then(function (body) {
          var record = {
            at: now(),
            body: body,
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          };
          if (response.ok) cache[url] = record;
          return { record: record };
        });
      });
      cache['#' + url] = inflight;
      var release = function () {
        delete cache['#' + url];
      };
      inflight.then(release, release);
    }
    return cache['#' + url].then(function (result) {
      var rebuilt = result.record ? build(result.record) : null;
      return rebuilt || result.raw;
    });
  };
})(window);`;

/**
 * Wujie loads `jsBeforeLoaders` before the sub-application scripts, both during
 * `preloadApp` and on a fresh mount.
 */
export function createConsoleV3SpringCloudProbeCachePlugin() {
  return { jsBeforeLoaders: [{ content: SPRINGCLOUD_PROBE_CACHE_SOURCE }] };
}

/** Patch a child window that skipped `jsBeforeLoaders` (SPA list fiber). */
export function ensureSpringCloudProbeCacheInChild(appWindow: Window | undefined | null): boolean {
  if (!appWindow || typeof appWindow.fetch !== 'function') return false;
  const child = appWindow as unknown as Record<string, unknown>;
  if (child[PROBE_CACHE_FLAG]) return false;
  try {
    const install = new Function('window', SPRINGCLOUD_PROBE_CACHE_SOURCE) as (w: Window) => void;
    install(appWindow);
    return !!child[PROBE_CACHE_FLAG];
  } catch {
    return false;
  }
}

export function getSpringCloudProbeCluster(pathname: string): string | undefined {
  const matched = /\/clusters\/([^/?#]+)(?:\/|$)/.exec(pathname);
  if (matched) {
    return matched[1];
  }
  // V3 resolves a missing cluster segment to the host cluster.
  return pathname.includes('/projects/') ? 'host' : undefined;
}

export function getSpringCloudProbeUrl(cluster: string): string {
  return `/kapis/clusters/${cluster}/resources.kubesphere.io/v1alpha3/customresourcedefinitions?name=${SPRINGCLOUD_CRD_NAME}`;
}

export function getSpringCloudProbeSeedStore(): Record<string, SpringCloudProbeRecord> {
  const host = window as unknown as Record<string, unknown>;
  const store = (host[SPRINGCLOUD_PROBE_SEEDS_KEY] ||= {}) as Record<
    string,
    SpringCloudProbeRecord
  >;
  return store;
}

const defaultSessionStorage = (): ProbeSessionStorage | null => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Restore probe answers saved by a previous page load in this tab. Hard refresh
 * otherwise restarts the 1–2 s ks-apiserver CRD probe before V3 can paint.
 */
export function hydrateSpringCloudProbeSeedsFromSession(
  store: Record<string, SpringCloudProbeRecord> = getSpringCloudProbeSeedStore(),
  storage: ProbeSessionStorage | null = defaultSessionStorage(),
  now: number = Date.now(),
): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(SPRINGCLOUD_PROBE_SESSION_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, SpringCloudProbeRecord>;
    let loaded = 0;
    Object.entries(parsed || {}).forEach(([cluster, record]) => {
      if (!record || record.status < 200 || !record.body) return;
      if (now - record.at >= SPRINGCLOUD_PROBE_CACHE_TTL_MS) return;
      const existing = store[cluster];
      if (!existing || existing.at < record.at) {
        store[cluster] = record;
        loaded += 1;
      }
    });
    return loaded;
  } catch {
    return 0;
  }
}

export function persistSpringCloudProbeSeeds(
  store: Record<string, SpringCloudProbeRecord> = getSpringCloudProbeSeedStore(),
  storage: ProbeSessionStorage | null = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SPRINGCLOUD_PROBE_SESSION_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — priming still works in-memory for this page.
  }
}

interface PrimeDeps {
  fetchImpl?: typeof fetch;
  store?: Record<string, SpringCloudProbeRecord>;
  now?: number;
  storage?: ProbeSessionStorage | null;
}

const priming = new Map<string, Promise<void>>();

/**
 * Starts the probe from the host as soon as the console boots, so the answer is
 * already on the parent window when V3 asks for it during its first mount. The
 * request is the same one V3 would issue, from the same session, so a failure
 * only restores the old behaviour.
 */
export function primeSpringCloudProbeCache(cluster: string, deps: PrimeDeps = {}): Promise<void> {
  const store = deps.store ?? getSpringCloudProbeSeedStore();
  const storage = deps.storage === undefined ? defaultSessionStorage() : deps.storage;
  const now = deps.now ?? Date.now();
  const cached = store[cluster];
  if (cached && now - cached.at < SPRINGCLOUD_PROBE_CACHE_TTL_MS) {
    return Promise.resolve();
  }
  const running = priming.get(cluster);
  if (running) {
    return running;
  }
  const fetchImpl = deps.fetchImpl ?? window.fetch.bind(window);
  const task = fetchImpl(getSpringCloudProbeUrl(cluster), {
    headers: { accept: 'application/json' },
  })
    .then(async response => {
      if (!response?.ok) {
        return;
      }
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      store[cluster] = {
        at: deps.now ?? Date.now(),
        body: await response.clone().text(),
        status: response.status,
        statusText: response.statusText,
        headers,
      };
      persistSpringCloudProbeSeeds(store, storage);
    })
    .catch(() => undefined)
    .then(() => {
      priming.delete(cluster);
    });
  priming.set(cluster, task);
  return task;
}

/**
 * Cold loads reach this before React renders, which leaves the probe in flight
 * while the V3 bundle is still downloading. Login and workspace routes never
 * mount a V3 resource page and are skipped.
 */
export function primeSpringCloudProbeCacheForRoute(
  pathname: string = window.location.pathname,
  deps: PrimeDeps = {},
): void {
  if (pathname.startsWith('/login')) {
    return;
  }
  const cluster = getSpringCloudProbeCluster(pathname);
  if (!cluster) {
    return;
  }
  const store = deps.store ?? getSpringCloudProbeSeedStore();
  const storage = deps.storage === undefined ? defaultSessionStorage() : deps.storage;
  hydrateSpringCloudProbeSeedsFromSession(store, storage, deps.now ?? Date.now());
  void primeSpringCloudProbeCache(cluster, { ...deps, store, storage });
}
