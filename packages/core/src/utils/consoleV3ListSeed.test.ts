/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import test from 'node:test';

import {
  CONSOLE_V3_LIST_SEED_SOURCE,
  CONSOLE_V3_LIST_SEEDS_KEY,
  CONSOLE_V3_LIST_SEED_TTL_MS,
  ensureConsoleV3ListSeedInChild,
  getConsoleV3ListPathKey,
  getConsoleV3ListSeedKey,
  getConsoleV3ListSeedUrl,
  primeConsoleV3ListSeed,
  type ConsoleV3ListSeedRecord,
} from './consoleV3ListSeed';

const listKey =
  '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments?sortBy=updateTime&limit=10';

test('builds the V3 list kapis URL from a project host pathname', () => {
  assert.equal(
    getConsoleV3ListSeedUrl('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    listKey,
  );
  assert.equal(getConsoleV3ListSeedUrl('/workspaces'), undefined);
});

test('normalizes list URLs to a pathname key and an exact seed key', () => {
  assert.equal(
    getConsoleV3ListPathKey(listKey),
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments',
  );
  assert.equal(getConsoleV3ListSeedKey(listKey), listKey);
});

test('primes the host seed store from a successful list response', async () => {
  const store: Record<string, ConsoleV3ListSeedRecord> = {};
  const body = '{"items":[{"metadata":{"name":"wes-v2-server"}}]}';
  await primeConsoleV3ListSeed('/dev-workspace/clusters/host/projects/dev-wes/deployments', {
    store,
    now: 1_000,
    fetchImpl: async () =>
      new Response(body, {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(store[listKey]?.body, body);
  assert.equal(store[listKey]?.at, 1_000);
  assert.ok(CONSOLE_V3_LIST_SEED_TTL_MS >= 10_000);
});

test('ensureConsoleV3ListSeedInChild installs the fetch wrapper when missing', () => {
  const win: Record<string, unknown> = {
    Date,
    URL,
    Response,
    location: { href: 'http://ks.local/consolev3/x' },
    parent: {},
    fetch: async () => new Response('{}', { status: 200 }),
  };
  assert.equal(ensureConsoleV3ListSeedInChild(win as unknown as Window), true);
  assert.equal(ensureConsoleV3ListSeedInChild(win as unknown as Window), false);
  assert.ok(CONSOLE_V3_LIST_SEED_SOURCE.includes('__KS_CONSOLE_V3_LIST_SEED_CACHE__'));
  assert.ok(CONSOLE_V3_LIST_SEED_SOURCE.includes('LIST_PATH'));
  assert.doesNotMatch(CONSOLE_V3_LIST_SEED_SOURCE, /response\.clone\(\)\.text\(\)/);
});

test('sandbox fetch answers the first matching list GET from the host seed', async () => {
  const body = '{"items":[]}';
  const calls: string[] = [];
  const seeds: Record<string, ConsoleV3ListSeedRecord> = {
    [listKey]: {
      at: Date.now(),
      body,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      pathKey: listKey,
    },
  };
  const win: Record<string, unknown> = {
    Date,
    URL,
    Response,
    location: { href: 'http://192.168.2.131:30881/consolev3/x' },
    parent: {
      [CONSOLE_V3_LIST_SEEDS_KEY]: seeds,
    },
    fetch: async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response('network', { status: 200 });
    },
  };

  new Function('window', CONSOLE_V3_LIST_SEED_SOURCE)(win);
  const response = await (win.fetch as typeof fetch)(listKey);
  assert.equal(await response.text(), body);
  assert.equal(calls.length, 0);
  assert.equal(seeds[listKey], undefined, 'host seed is consumed once');

  // Second identical GET stays on the short-lived sandbox cache (covers V3 double fetch).
  await (win.fetch as typeof fetch)(listKey);
  assert.equal(calls.length, 0);
});

test('sandbox fetch ignores a different query and detail or log paths', async () => {
  const body = '{"items":[]}';
  const calls: string[] = [];
  const seeds: Record<string, ConsoleV3ListSeedRecord> = {
    [listKey]: {
      at: Date.now(),
      body,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      pathKey: listKey,
    },
  };
  const win: Record<string, unknown> = {
    Date,
    URL,
    Response,
    location: { href: 'http://192.168.2.131:30881/consolev3/x' },
    parent: { [CONSOLE_V3_LIST_SEEDS_KEY]: seeds },
    fetch: async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response('network', { status: 200 });
    },
  };

  new Function('window', CONSOLE_V3_LIST_SEED_SOURCE)(win);

  const otherQuery =
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments?page=2&limit=10';
  assert.equal(await (await (win.fetch as typeof fetch)(otherQuery)).text(), 'network');

  const detail =
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments/wes-v2-server';
  assert.equal(await (await (win.fetch as typeof fetch)(detail)).text(), 'network');

  const log =
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/pods/p1/log?container=c1';
  assert.equal(await (await (win.fetch as typeof fetch)(log)).text(), 'network');

  assert.equal(calls.length, 3);
  assert.ok(seeds[listKey], 'unrelated misses must not consume the primed seed');
});
