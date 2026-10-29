import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SPRINGCLOUD_CRD_NAME,
  SPRINGCLOUD_PROBE_CACHE_SOURCE,
  SPRINGCLOUD_PROBE_CACHE_TTL_MS,
} from './springcloudProbeCache';

const PROBE_URL = `/kapis/clusters/host/resources.kubesphere.io/v1alpha3/customresourcedefinitions?name=${SPRINGCLOUD_CRD_NAME}`;
const EMPTY_LIST = '{"items":[],"totalItems":0}';

interface FetchCall {
  url: string;
}

function createSandbox(options: { status?: number; body?: string } = {}) {
  const calls: FetchCall[] = [];
  let clock = 0;
  const win: Record<string, any> = {
    Date: { now: () => clock },
    Response,
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
    /import \{ createConsoleV3SpringCloudProbeCachePlugin \} from '\.\/springcloudProbeCache'/,
  );
  assert.match(
    source,
    /const consoleV3Plugins = \[createConsoleV3SpringCloudProbeCachePlugin\(\)\]/,
  );
  assert.equal(source.match(/plugins: consoleV3Plugins/g)?.length, 2);

  const preload = source.match(/preloadApp\(\{\n    name: 'consolev3',[\s\S]*?\n  \}\);/);
  assert.ok(preload, 'consolev3 preload not found');
  assert.match(preload[0], /plugins: consoleV3Plugins/);

  const setup = source.match(/setupApp\(\{\n    name: 'consolev3',[\s\S]*?\n  \}\);/);
  assert.ok(setup, 'consolev3 setup not found');
  assert.match(setup[0], /plugins: consoleV3Plugins/);
});
