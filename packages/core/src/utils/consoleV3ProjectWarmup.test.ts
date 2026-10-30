/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import test from 'node:test';

import {
  CONSOLE_V3_LAST_PROJECT_SESSION_KEY,
  buildConsoleV3ProjectDeploymentsPath,
  getConsoleV3ProjectBasePath,
  installConsoleV3ProjectWarmup,
  isConsoleV3ProjectOverviewPath,
  rememberConsoleV3ProjectBase,
  requestConsoleV3ProjectListWarmup,
  resetConsoleV3ProjectWarmupState,
  scheduleConsoleV3ProjectListWarmup,
  warmLastConsoleV3Project,
} from './consoleV3ProjectWarmup';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    _store: store,
  };
}

test('derives project base and deployments warmup path', () => {
  assert.equal(
    getConsoleV3ProjectBasePath('/dev-workspace/clusters/host/projects/dev-wes/overview'),
    '/dev-workspace/clusters/host/projects/dev-wes',
  );
  assert.equal(
    buildConsoleV3ProjectDeploymentsPath('/dev-workspace/clusters/host/projects/dev-wes/base-info'),
    '/dev-workspace/clusters/host/projects/dev-wes/deployments',
  );
  assert.equal(buildConsoleV3ProjectDeploymentsPath('/dashboard'), undefined);
  assert.equal(
    isConsoleV3ProjectOverviewPath('/dev-workspace/clusters/host/projects/dev-wes/overview'),
    true,
  );
});

test('primes and preloads when host is on dashboard (early warm)', () => {
  resetConsoleV3ProjectWarmupState();
  const primed: string[] = [];
  const preloads: string[] = [];
  const result = scheduleConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/deployments',
    {
      host: 'example.test',
      locationPathname: () => '/dashboard',
      primeListSeed: path => primed.push(`seed:${path}`),
      primeProbe: path => primed.push(`probe:${path}`),
      preloadApp: ({ url }) => preloads.push(url),
      scheduleIdle: fn => fn(),
      storage: memoryStorage(),
      document: null,
    },
  );
  assert.equal(result.preloadScheduled, true);
  assert.deepEqual(preloads, [
    '//example.test/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments',
  ]);
  assert.ok(primed.some(p => p.startsWith('probe:')));
});

test('skips preloadApp while host is viewing overview', () => {
  resetConsoleV3ProjectWarmupState();
  const preloads: string[] = [];
  const result = scheduleConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/deployments',
    {
      host: 'example.test',
      locationPathname: () => '/dev-workspace/clusters/host/projects/dev-wes/overview',
      primeListSeed: () => undefined,
      primeProbe: () => undefined,
      preloadApp: ({ url }) => preloads.push(url),
      scheduleIdle: fn => fn(),
      storage: memoryStorage(),
      document: null,
    },
  );
  assert.equal(result.preloadScheduled, false);
  assert.deepEqual(preloads, []);
});

test('warmLastConsoleV3Project uses remembered session project on shell', () => {
  resetConsoleV3ProjectWarmupState();
  const storage = memoryStorage();
  const preloads: string[] = [];
  rememberConsoleV3ProjectBase('/dev-workspace/clusters/host/projects/dev-wes/overview', {
    storage,
  });
  assert.equal(
    storage.getItem(CONSOLE_V3_LAST_PROJECT_SESSION_KEY),
    '/dev-workspace/clusters/host/projects/dev-wes',
  );
  const result = warmLastConsoleV3Project({
    host: 'example.test',
    locationPathname: () => '/dashboard',
    storage,
    document: null,
    primeListSeed: () => undefined,
    primeProbe: () => undefined,
    preloadApp: ({ url }) => preloads.push(url),
    scheduleIdle: fn => fn(),
  });
  assert.equal(result.preloadScheduled, true);
  assert.equal(preloads.length, 1);
});

test('install exposes host scheduler and remembers via schedule', () => {
  resetConsoleV3ProjectWarmupState();
  const host: Record<string, unknown> = {};
  const storage = memoryStorage();
  const primed: string[] = [];
  installConsoleV3ProjectWarmup({
    host: 'example.test',
    bindHost: host,
    storage,
    document: null,
    locationPathname: () => '/dashboard',
    primeListSeed: path => primed.push(path),
    primeProbe: () => undefined,
    preloadApp: () => undefined,
    scheduleIdle: fn => fn(),
  });

  requestConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/deployments',
    host,
  );
  assert.deepEqual(primed, ['/dev-workspace/clusters/host/projects/dev-wes/deployments']);
  assert.equal(
    storage.getItem(CONSOLE_V3_LAST_PROJECT_SESSION_KEY),
    '/dev-workspace/clusters/host/projects/dev-wes',
  );
});
