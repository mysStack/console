import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getSpringCloudProbeCluster,
  getSpringCloudProbeUrl,
  hydrateSpringCloudProbeSeedsFromSession,
  persistSpringCloudProbeSeeds,
  primeSpringCloudProbeCache,
  primeSpringCloudProbeCacheForRoute,
  SPRINGCLOUD_CRD_NAME,
  SPRINGCLOUD_PROBE_CACHE_SOURCE,
  SPRINGCLOUD_PROBE_CACHE_TTL_MS,
  SPRINGCLOUD_PROBE_SEEDS_KEY,
  SPRINGCLOUD_PROBE_SESSION_KEY,
  type SpringCloudProbeRecord,
} from './springcloudProbeCache';

const PROBE_URL = `/kapis/clusters/host/resources.kubesphere.io/v1alpha3/customresourcedefinitions?name=${SPRINGCLOUD_CRD_NAME}`;
const EMPTY_LIST = '{"items":[],"totalItems":0}';

interface FetchCall {
  url: string;
}

function createSandbox(
  options: { status?: number; body?: string; seeds?: Record<string, SpringCloudProbeRecord> } = {},
) {
  const calls: FetchCall[] = [];
  let clock = 0;
  const win: Record<string, any> = {
    Date: { now: () => clock },
    Response,
    parent: options.seeds ? { [SPRINGCLOUD_PROBE_SEEDS_KEY]: options.seeds } : {},
    fetch: (input: string | { url: string }) => {
      const url = typeof input === 'string' ? input : input.url;
      calls.push({ url });
      return Promise.resolve(
        new Response(options.body ?? EMPTY_LIST, { status: options.status ?? 200 }),
      );
    },
  };
  const install = new Function('window', SPRINGCLOUD_PROBE_CACHE_SOURCE) as (w: unknown) => void;
  install(win);
  return {
    win,
    calls,
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

test('repeat springcloud probes are answered from the cache', async () => {
  const sandbox = createSandbox();
  const first = await sandbox.win.fetch(PROBE_URL);
  const second = await sandbox.win.fetch(PROBE_URL);

  assert.equal(sandbox.calls.length, 1);
  assert.equal(first.status, 200);
  assert.equal(await second.text(), EMPTY_LIST);
  assert.notEqual(first, second, 'each caller needs its own response body');
});

test('the cache expires after the TTL', async () => {
  const sandbox = createSandbox();
  await sandbox.win.fetch(PROBE_URL);
  sandbox.tick(SPRINGCLOUD_PROBE_CACHE_TTL_MS - 1);
  await sandbox.win.fetch(PROBE_URL);
  assert.equal(sandbox.calls.length, 1);

  sandbox.tick(1);
  await sandbox.win.fetch(PROBE_URL);
  assert.equal(sandbox.calls.length, 2);
});

test('other requests keep their own path and timing', async () => {
  const sandbox = createSandbox();
  const response = await sandbox.win.fetch('/kapis/resources.kubesphere.io/v1alpha3/clusters/host');
  await sandbox.win.fetch('/kapis/resources.kubesphere.io/v1alpha3/clusters/host');

  assert.equal(sandbox.calls.length, 2);
  assert.equal(response.status, 200);
});

test('a non-GET probe is left alone', async () => {
  const sandbox = createSandbox();
  await sandbox.win.fetch(PROBE_URL, { method: 'POST' });
  await sandbox.win.fetch(PROBE_URL, { method: 'POST' });

  assert.equal(sandbox.calls.length, 2);
});

test('failed probes are not cached', async () => {
  const sandbox = createSandbox({ status: 500, body: 'boom' });
  const first = await sandbox.win.fetch(PROBE_URL);
  const second = await sandbox.win.fetch(PROBE_URL);

  assert.equal(sandbox.calls.length, 2);
  assert.equal(first.status, 500);
  assert.equal(await second.text(), 'boom');
});

test('concurrent probes share one request and still get separate bodies', async () => {
  const sandbox = createSandbox();
  const [a, b] = await Promise.all([sandbox.win.fetch(PROBE_URL), sandbox.win.fetch(PROBE_URL)]);

  assert.equal(sandbox.calls.length, 1);
  assert.notEqual(a, b);
  assert.equal(await a.text(), EMPTY_LIST);
  assert.equal(await b.text(), EMPTY_LIST);
});

test('installing twice keeps one wrapper', () => {
  const sandbox = createSandbox();
  const installed = sandbox.win.fetch;
  new Function('window', SPRINGCLOUD_PROBE_CACHE_SOURCE)(sandbox.win);
  assert.equal(sandbox.win.fetch, installed);
});

test('initWujie loads the probe cache into the shared V3 app before its scripts', () => {
  const source = readFileSync(__filename.replace(/[^/]+$/, 'wujie.ts'), 'utf8');

  assert.match(
    source,
    /import \{[\s\S]{0,160}createConsoleV3SpringCloudProbeCachePlugin[\s\S]{0,160}\} from '\.\/springcloudProbeCache'/,
  );
  assert.match(source, /primeSpringCloudProbeCacheForRoute\(\);/);
  assert.match(source, /primeConsoleV3ListSeedForRoute\(\);/);
  assert.match(source, /resolveConsoleV3PreloadUrl\(window\.location\.pathname\)/);
  assert.match(
    source,
    /const consoleV3Plugins = \[\n  createConsoleV3SpringCloudProbeCachePlugin\(\),\n  createConsoleV3ListSeedPlugin\(\),\n\]/,
  );
  assert.equal(source.match(/plugins: consoleV3Plugins/g)?.length, 2);

  const preload = source.match(/preloadApp\(\{\n    name: 'consolev3',[\s\S]*?\n  \}\);/);
  assert.ok(preload, 'consolev3 preload not found');
  assert.match(preload[0], /plugins: consoleV3Plugins/);
  assert.match(preload[0], /url: preloadUrl/);
  assert.doesNotMatch(preload[0], /consolev3\/dashboard/);

  const setup = source.match(/setupApp\(\{\n    name: 'consolev3',[\s\S]*?\n  \}\);/);
  assert.ok(setup, 'consolev3 setup not found');
  assert.match(setup[0], /plugins: consoleV3Plugins/);
});

function seedRecord(overrides: Partial<SpringCloudProbeRecord> = {}): SpringCloudProbeRecord {
  return {
    at: 0,
    body: EMPTY_LIST,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    ...overrides,
  };
}

const SANDBOX_PROBE_URL = `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/customresourcedefinitions?name=${SPRINGCLOUD_CRD_NAME}`;

test('the first probe is answered from the host seed without a request', async () => {
  const sandbox = createSandbox({ seeds: { host: seedRecord() } });
  const response = await sandbox.win.fetch(SANDBOX_PROBE_URL);

  assert.equal(sandbox.calls.length, 0);
  assert.equal(await response.text(), EMPTY_LIST);

  // The seeded answer is cached, so later switches stay local too.
  await sandbox.win.fetch(SANDBOX_PROBE_URL);
  assert.equal(sandbox.calls.length, 0);
});

test('a seed for another cluster or an expired seed is ignored', async () => {
  const otherCluster = createSandbox({ seeds: { 'dev-biz': seedRecord() } });
  await otherCluster.win.fetch(SANDBOX_PROBE_URL);
  assert.equal(otherCluster.calls.length, 1);

  const expired = createSandbox({
    seeds: { host: seedRecord({ at: -SPRINGCLOUD_PROBE_CACHE_TTL_MS - 1 }) },
  });
  await expired.win.fetch(SANDBOX_PROBE_URL);
  assert.equal(expired.calls.length, 1);
});

test('the probe cluster comes from the route, falling back to the host cluster', () => {
  assert.equal(
    getSpringCloudProbeCluster('/dev-workspace/clusters/host/projects/dev-wms/pods'),
    'host',
  );
  assert.equal(getSpringCloudProbeCluster('/clusters/dev-biz/pods'), 'dev-biz');
  assert.equal(getSpringCloudProbeCluster('/dev-workspace/projects/dev-wms/pods'), 'host');
  assert.equal(getSpringCloudProbeCluster('/workspaces/dev-workspace'), undefined);
  assert.match(
    getSpringCloudProbeUrl('dev-biz'),
    /^\/kapis\/clusters\/dev-biz\/resources\.kubesphere\.io/,
  );
});

test('priming stores the probe answer for the sandbox', async () => {
  const store: Record<string, SpringCloudProbeRecord> = {};
  let calls = 0;
  const fetchImpl = (() => {
    calls += 1;
    return Promise.resolve(new Response(EMPTY_LIST, { status: 200 }));
  }) as unknown as typeof fetch;

  await primeSpringCloudProbeCache('host', { store, fetchImpl, now: 1000 });

  assert.equal(calls, 1);
  assert.equal(store.host.status, 200);
  assert.equal(store.host.at, 1000);
  assert.equal(store.host.body, EMPTY_LIST);
});

test('priming skips a fresh seed and ignores a failed probe', async () => {
  let calls = 0;
  const fetchImpl = (() => {
    calls += 1;
    return Promise.resolve(new Response('nope', { status: 500 }));
  }) as unknown as typeof fetch;

  const store: Record<string, SpringCloudProbeRecord> = { host: seedRecord({ at: 900 }) };
  await primeSpringCloudProbeCache('host', { store, fetchImpl, now: 1000 });
  assert.equal(calls, 0);

  const empty: Record<string, SpringCloudProbeRecord> = {};
  await primeSpringCloudProbeCache('host', { store: empty, fetchImpl, now: 1000 });
  assert.equal(calls, 1);
  assert.equal(empty.host, undefined);
});

test('priming shares one request between concurrent callers', async () => {
  let calls = 0;
  const fetchImpl = (() => {
    calls += 1;
    return Promise.resolve(new Response(EMPTY_LIST, { status: 200 }));
  }) as unknown as typeof fetch;

  const store: Record<string, SpringCloudProbeRecord> = {};
  await Promise.all([
    primeSpringCloudProbeCache('dev-wes', { store, fetchImpl }),
    primeSpringCloudProbeCache('dev-wes', { store, fetchImpl }),
  ]);
  assert.equal(calls, 1);
  assert.equal(store['dev-wes'].body, EMPTY_LIST);
});

test('route priming skips login and routes without a cluster', async () => {
  const store: Record<string, SpringCloudProbeRecord> = {};
  const fetchImpl = (() =>
    Promise.resolve(new Response(EMPTY_LIST, { status: 200 }))) as unknown as typeof fetch;

  primeSpringCloudProbeCacheForRoute('/login', { store, fetchImpl });
  primeSpringCloudProbeCacheForRoute('/workspaces/dev-workspace', { store, fetchImpl });
  assert.deepEqual(Object.keys(store), []);

  primeSpringCloudProbeCacheForRoute('/dev-workspace/clusters/host/projects/dev-wms/pods', {
    store,
    fetchImpl,
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(store.host?.body, EMPTY_LIST);
});

test('session storage hydrates a fresh seed across hard refresh', () => {
  const memory: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => {
      memory[key] = value;
    },
  };
  const persisted: Record<string, SpringCloudProbeRecord> = {
    host: seedRecord({ at: 5_000, body: EMPTY_LIST }),
  };
  persistSpringCloudProbeSeeds(persisted, storage as Storage);

  const store: Record<string, SpringCloudProbeRecord> = {};
  const loaded = hydrateSpringCloudProbeSeedsFromSession(store, storage as Storage, 6_000);
  assert.equal(loaded, 1);
  assert.equal(store.host.body, EMPTY_LIST);
  assert.equal(memory[SPRINGCLOUD_PROBE_SESSION_KEY] !== undefined, true);
});

test('session hydration ignores expired probe seeds', () => {
  const memory: Record<string, string> = {
    [SPRINGCLOUD_PROBE_SESSION_KEY]: JSON.stringify({
      host: seedRecord({ at: 0 }),
    }),
  };
  const storage = {
    getItem: (key: string) => memory[key] ?? null,
    setItem: () => undefined,
  };
  const store: Record<string, SpringCloudProbeRecord> = {};
  const loaded = hydrateSpringCloudProbeSeedsFromSession(
    store,
    storage as Storage,
    SPRINGCLOUD_PROBE_CACHE_TTL_MS + 1,
  );
  assert.equal(loaded, 0);
  assert.deepEqual(store, {});
});

test('initWujie defers actions dashboard preload on project list routes', () => {
  const source = readFileSync(__filename.replace(/[^/]+$/, 'wujie.ts'), 'utf8');
  assert.match(source, /isConsoleV3ProjectListPath/);
  assert.match(source, /consoleV3Actions/);
  // List landings must not kick dashboard actions preload in the same turn as
  // the aligned list preload — that double HTML+bundle work shows up as ~1s
  // of contending `/consolev3/dashboard` on hard refresh.
  assert.match(source, /setTimeout\(preloadActions,\s*2500\)/);
  assert.match(source, /isConsoleV3ProjectListPath\(window\.location\.pathname\)/);
});
