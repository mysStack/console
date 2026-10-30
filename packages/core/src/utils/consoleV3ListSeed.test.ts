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
  getConsoleV3ListPathKey,
  getConsoleV3ListSeedUrl,
  primeConsoleV3ListSeed,
  type ConsoleV3ListSeedRecord,
} from './consoleV3ListSeed';

test('builds the V3 list kapis URL from a project host pathname', () => {
  assert.equal(
    getConsoleV3ListSeedUrl('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments?sortBy=updateTime&limit=10',
  );
  assert.equal(getConsoleV3ListSeedUrl('/workspaces'), undefined);
});

test('normalizes list URLs to a pathname key for seed matching', () => {
  assert.equal(
    getConsoleV3ListPathKey(
      '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments?sortBy=updateTime&limit=10',
    ),
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments',
  );
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

  const key =
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments';
  assert.equal(store[key]?.body, body);
  assert.equal(store[key]?.at, 1_000);
  assert.ok(CONSOLE_V3_LIST_SEED_TTL_MS >= 10_000);
});

test('sandbox fetch answers the first matching list GET from the host seed', async () => {
  const key =
    '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/dev-wes/deployments';
  const body = '{"items":[]}';
  const calls: string[] = [];
  const win: Record<string, unknown> = {
    Date,
    URL,
    Response,
    location: { href: 'http://192.168.2.131:30881/consolev3/x' },
    parent: {
      [CONSOLE_V3_LIST_SEEDS_KEY]: {
        [key]: {
          at: Date.now(),
          body,
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          pathKey: key,
        },
      },
    },
    fetch: async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response('network', { status: 200 });
    },
  };

  new Function('window', CONSOLE_V3_LIST_SEED_SOURCE)(win);
  const response = await (win.fetch as typeof fetch)(`${key}?sortBy=updateTime&limit=10`);
  assert.equal(await response.text(), body);
  assert.equal(calls.length, 0);

  // Second identical GET stays on the short-lived sandbox cache (covers V3 double fetch).
  await (win.fetch as typeof fetch)(`${key}?sortBy=updateTime&limit=10`);
  assert.equal(calls.length, 0);
});
