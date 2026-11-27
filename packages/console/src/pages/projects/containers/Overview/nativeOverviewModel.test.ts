import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  getNativeOverviewMode,
  getProjectResourceHref,
  getScopedWorkloadRank,
} from './nativeOverviewModel';

test('native overview is an explicit test-session opt-in; unavailable storage keeps legacy', () => {
  assert.equal(getNativeOverviewMode({ getItem: () => null }), false);
  assert.equal(getNativeOverviewMode({ getItem: () => '1' }), true);
  assert.equal(getNativeOverviewMode({ getItem: () => 'true' }), false);
  assert.equal(
    getNativeOverviewMode({
      getItem: () => {
        throw new Error('disabled');
      },
    }),
    false,
  );
});

test('workspace overview resource links retain all three scope segments', () => {
  const scope = { workspace: 'dev-workspace', cluster: 'host', namespace: 'dev-wms' };
  assert.equal(
    getProjectResourceHref(scope, 'deployments'),
    '/dev-workspace/clusters/host/projects/dev-wms/deployments',
  );
  assert.equal(
    getProjectResourceHref(scope, 'volumes', 'pending'),
    '/dev-workspace/clusters/host/projects/dev-wms/volumes?status=pending',
  );
  assert.equal(getProjectResourceHref({ ...scope, namespace: '' }, 'pods'), '');
});

test('ranking only displays finite values with an explicit matching namespace and cluster', () => {
  const data = {
    results: [
      {
        metric_name: 'workload_cpu_usage',
        data: {
          result: [
            {
              metric: {
                namespace: 'dev-wms',
                cluster: 'host',
                owner_kind: 'Deployment',
                workload: 'Deployment:one',
              },
              value: [1, '2'],
            },
            {
              metric: {
                namespace: 'other',
                cluster: 'host',
                owner_kind: 'Deployment',
                workload: 'Deployment:two',
              },
              value: [1, '5'],
            },
            { metric: { owner_kind: 'Deployment', workload: 'Deployment:three' }, value: [1, '4'] },
            {
              metric: {
                namespace: 'dev-wms',
                cluster: 'other',
                owner_kind: 'Deployment',
                workload: 'Deployment:four',
              },
              value: [1, '4'],
            },
            {
              metric: { namespace: 'dev-wms', owner_kind: 'Pod', workload: 'Pod:five' },
              value: [1, 'NaN'],
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(
    getScopedWorkloadRank(data, 'workload_cpu_usage', { namespace: 'dev-wms', cluster: 'host' }),
    [{ name: 'one', kind: 'Deployment', value: 2 }],
  );
});

test('normal routes retain the legacy sandbox and the alternative renders within the same route', () => {
  const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
  assert.match(source, /getNativeOverviewMode/);
  assert.match(source, /<NativeProjectOverview/);
  assert.match(source, /<ConsoleV3AliveEmbed/);
});

test('actual monitoring response workload_type label preserves the resource kind for links', () => {
  const data = {
    results: [
      {
        metric_name: 'workload_cpu_usage',
        data: {
          result: [
            {
              metric: { namespace: 'dev-wms', workload: 'wms-a', workload_type: 'deployment' },
              value: [1, '4'],
            },
            {
              metric: { namespace: 'dev-wms', workload: 'wms-b', workload_type: 'StatefulSet' },
              value: [1, '2'],
            },
            {
              metric: { namespace: 'dev-wms', workload: 'wms-c', workload_type: 'daemonsets' },
              value: [1, '1'],
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(
    getScopedWorkloadRank(data, 'workload_cpu_usage', { namespace: 'dev-wms', cluster: 'host' }),
    [
      { name: 'wms-a', kind: 'Deployment', value: 4 },
      { name: 'wms-b', kind: 'StatefulSet', value: 2 },
      { name: 'wms-c', kind: 'DaemonSet', value: 1 },
    ],
  );
});
