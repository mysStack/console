/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Host-side seed for the first V3 resource-list GET.
 *
 * Cold start otherwise waits for the V3 bundle to boot before issuing
 * `.../namespaces/{ns}/{resource}?sortBy=updateTime&limit=10`. Starting the
 * same request from the host in parallel with `preloadApp` removes that wait
 * from the first (and often second identical) list fetch.
 */

export const CONSOLE_V3_LIST_SEED_TTL_MS = 15_000;
export const CONSOLE_V3_LIST_SEEDS_KEY = '__KS_CONSOLE_V3_LIST_SEEDS__';
const LIST_SEED_FLAG = '__KS_CONSOLE_V3_LIST_SEED_CACHE__';

export interface ConsoleV3ListSeedRecord {
  at: number;
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** Pathname form used for matching (no origin, query stripped). */
  pathKey: string;
}

const PROJECT_LIST_PATH = /^\/([^/]+)\/clusters\/([^/]+)\/projects\/([^/]+)\/([^/]+)\/?$/;

const RESOURCE_ALIASES: Record<string, string> = {
  deployments: 'deployments',
  statefulsets: 'statefulsets',
  daemonsets: 'daemonsets',
  pods: 'pods',
  services: 'services',
  ingresses: 'ingresses',
  jobs: 'jobs',
  cronjobs: 'cronjobs',
  configmaps: 'configmaps',
  secrets: 'secrets',
  persistentvolumeclaims: 'persistentvolumeclaims',
  serviceaccounts: 'serviceaccounts',
  roles: 'roles',
};

export function getConsoleV3ListPathKey(url: string): string | undefined {
  try {
    const parsed = new URL(url, 'http://ks.local');
    return parsed.pathname;
  } catch {
    const path = String(url || '').split('?')[0];
    return path || undefined;
  }
}

/**
 * Build the kapis URL V3 uses for a project resource list.
 * Observed shape:
 * `/clusters/{cluster}/kapis/resources.kubesphere.io/v1alpha3/namespaces/{ns}/{resource}?sortBy=updateTime&limit=10`
 */
export function getConsoleV3ListSeedUrl(pathname: string): string | undefined {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  const matched = PROJECT_LIST_PATH.exec(path);
  if (!matched) return undefined;
  const cluster = matched[2];
  const namespace = matched[3];
  const resource = RESOURCE_ALIASES[matched[4]];
  if (!resource) return undefined;
  return `/clusters/${cluster}/kapis/resources.kubesphere.io/v1alpha3/namespaces/${namespace}/${resource}?sortBy=updateTime&limit=10`;
}

export function getConsoleV3ListSeedStore(): Record<string, ConsoleV3ListSeedRecord> {
  const host = window as unknown as Record<string, unknown>;
  const store = (host[CONSOLE_V3_LIST_SEEDS_KEY] ||= {}) as Record<string, ConsoleV3ListSeedRecord>;
  return store;
}

/**
 * Injected before the V3 bundle. Answers matching list GETs from the host seed
 * for a short TTL so the cold-start double-fetch pays once on the host.
 */
export const CONSOLE_V3_LIST_SEED_SOURCE = `(function (win) {
  if (!win || typeof win.fetch !== 'function' || win.${LIST_SEED_FLAG}) return;
  var TTL = ${CONSOLE_V3_LIST_SEED_TTL_MS};
  var original = win.fetch;
  var cache = {};
  win.${LIST_SEED_FLAG} = cache;

  function pathKey(input) {
    if (!input) return '';
    var url = typeof input === 'string' ? input : input.url || '';
    try {
      return new (win.URL || URL)(url, win.location && win.location.href || 'http://ks.local').pathname;
    } catch (e) {
      return String(url).split('?')[0];
    }
  }

  function matches(input) {
    var key = pathKey(input);
    return key.indexOf('/kapis/resources.kubesphere.io/') !== -1 && key.indexOf('/namespaces/') !== -1;
  }

  function now() {
    return (win.Date || Date).now();
  }

  function seedFor(key) {
    var seeds = null;
    try {
      seeds = win.parent && win.parent['${CONSOLE_V3_LIST_SEEDS_KEY}'];
    } catch (e) {
      return null;
    }
    if (!seeds) return null;
    var record = seeds[key];
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
    var key = pathKey(input);
    var hit = cache[key];
    if (hit && now() - hit.at < TTL) {
      var rebuilt = build(hit);
      if (rebuilt) return Promise.resolve(rebuilt);
    }
    var seed = seedFor(key);
    if (seed) {
      cache[key] = seed;
      var seeded = build(seed);
      if (seeded) return Promise.resolve(seeded);
    }
    return original.apply(win, arguments).then(function (response) {
      if (!response || !response.clone || !response.ok) return response;
      var headers = {};
      try {
        response.headers.forEach(function (value, k) {
          headers[k] = value;
        });
      } catch (e) {}
      return response.clone().text().then(function (body) {
        cache[key] = {
          at: now(),
          body: body,
          status: response.status,
          statusText: response.statusText,
          headers: headers,
          pathKey: key,
        };
        return response;
      });
    });
  };
})(window);`;

export function createConsoleV3ListSeedPlugin() {
  return { jsBeforeLoaders: [{ content: CONSOLE_V3_LIST_SEED_SOURCE }] };
}

interface PrimeDeps {
  fetchImpl?: typeof fetch;
  store?: Record<string, ConsoleV3ListSeedRecord>;
  now?: number;
}

const priming = new Map<string, Promise<void>>();

export function primeConsoleV3ListSeed(pathname: string, deps: PrimeDeps = {}): Promise<void> {
  const listUrl = getConsoleV3ListSeedUrl(pathname);
  if (!listUrl) return Promise.resolve();

  const pathKey = getConsoleV3ListPathKey(listUrl);
  if (!pathKey) return Promise.resolve();

  const store = deps.store ?? getConsoleV3ListSeedStore();
  const now = deps.now ?? Date.now();
  const cached = store[pathKey];
  if (cached && now - cached.at < CONSOLE_V3_LIST_SEED_TTL_MS) {
    return Promise.resolve();
  }

  const running = priming.get(pathKey);
  if (running) return running;

  const fetchImpl = deps.fetchImpl ?? window.fetch.bind(window);
  const task = fetchImpl(listUrl, { headers: { accept: 'application/json' } })
    .then(async response => {
      if (!response?.ok) return;
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      store[pathKey] = {
        at: deps.now ?? Date.now(),
        body: await response.clone().text(),
        status: response.status,
        statusText: response.statusText,
        headers,
        pathKey,
      };
    })
    .catch(() => undefined)
    .then(() => {
      priming.delete(pathKey);
    });

  priming.set(pathKey, task);
  return task;
}

export function primeConsoleV3ListSeedForRoute(
  pathname: string = typeof window === 'undefined' ? '/' : window.location.pathname,
  deps: PrimeDeps = {},
): void {
  if (pathname.startsWith('/login')) return;
  void primeConsoleV3ListSeed(pathname, deps);
}

const PRIMER_KEY = '__KS_PRIME_CONSOLE_V3_LIST_SEED__';

/**
 * Expose priming on the host window so SPA navigations into a V3 list (after
 * `initWujie` already ran for overview/workbench) can still start the list GET
 * before the embed mounts.
 */
export function installConsoleV3ListSeedPrimer(
  host: Record<string, unknown> = window as unknown as Record<string, unknown>,
): void {
  host[PRIMER_KEY] = primeConsoleV3ListSeedForRoute;
}

export function requestConsoleV3ListSeedForRoute(
  pathname: string,
  host: Record<string, unknown> = window as unknown as Record<string, unknown>,
): void {
  const primer = host[PRIMER_KEY];
  if (typeof primer === 'function') {
    (primer as (path: string) => void)(pathname);
  }
}
