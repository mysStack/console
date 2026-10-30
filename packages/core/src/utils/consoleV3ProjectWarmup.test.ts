/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import test from 'node:test';

import {
  buildConsoleV3ProjectDeploymentsPath,
  getConsoleV3ProjectBasePath,
  installConsoleV3ProjectWarmup,
  isConsoleV3ProjectOverviewPath,
  requestConsoleV3ProjectListWarmup,
  resetConsoleV3ProjectWarmupState,
  scheduleConsoleV3ProjectListWarmup,
} from './consoleV3ProjectWarmup';

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
  assert.equal(
    isConsoleV3ProjectOverviewPath('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    false,
  );
});

test('primes seed and probe for project routes and skips overview preloadApp', () => {
  resetConsoleV3ProjectWarmupState();
  const primed: string[] = [];
  const preloads: string[] = [];
  const result = scheduleConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/overview',
    {
      host: 'example.test',
      primeListSeed: path => primed.push(`seed:${path}`),
      primeProbe: path => primed.push(`probe:${path}`),
      preloadApp: ({ url }) => preloads.push(url),
      scheduleIdle: fn => fn(),
    },
  );
  assert.deepEqual(primed, [
    'probe:/dev-workspace/clusters/host/projects/dev-wes/deployments',
    'seed:/dev-workspace/clusters/host/projects/dev-wes/deployments',
  ]);
  assert.equal(result.preloadScheduled, false);
  assert.deepEqual(preloads, []);
});

test('schedules deployments preloadApp on non-overview project pages once per project', () => {
  resetConsoleV3ProjectWarmupState();
  const preloads: string[] = [];
  const first = scheduleConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/base-info',
    {
      host: 'example.test',
      primeListSeed: () => undefined,
      primeProbe: () => undefined,
      preloadApp: ({ name, url }) => preloads.push(`${name}:${url}`),
      scheduleIdle: fn => fn(),
    },
  );
  const second = scheduleConsoleV3ProjectListWarmup(
    '/dev-workspace/clusters/host/projects/dev-wes/deployments',
    {
      host: 'example.test',
      primeListSeed: () => undefined,
      primeProbe: () => undefined,
      preloadApp: ({ name, url }) => preloads.push(`${name}:${url}`),
      scheduleIdle: fn => fn(),
    },
  );
  assert.equal(first.preloadScheduled, true);
  assert.equal(second.preloadScheduled, false);
  assert.deepEqual(preloads, [
    'consolev3://example.test/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments',
  ]);
});

test('install exposes a host scheduler for BaseLayout', () => {
  resetConsoleV3ProjectWarmupState();
  const host: Record<string, unknown> = {};
  const primed: string[] = [];
  installConsoleV3ProjectWarmup({
    host: 'example.test',
    bindHost: host,
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
});
