import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKLOAD_ROUTE_PATHS,
  getWorkloadKind,
  getWorkloadPath,
  getWorkloadTitle,
} from './routeConfig';

test('registers native create and edit paths for supported workload kinds', () => {
  assert.deepEqual(WORKLOAD_ROUTE_PATHS, [
    'deployments/new',
    'deployments/:name/edit',
    'statefulsets/new',
    'statefulsets/:name/edit',
    'daemonsets/new',
    'daemonsets/:name/edit',
  ]);
});

test('resolves only controlled workload kinds and labels', () => {
  assert.equal(getWorkloadKind('deployments'), 'deployments');
  assert.equal(getWorkloadKind('statefulsets'), 'statefulsets');
  assert.equal(getWorkloadKind('daemonsets'), 'daemonsets');
  assert.equal(getWorkloadKind('jobs'), undefined);
  assert.equal(getWorkloadTitle('statefulsets', 'edit'), '编辑 StatefulSet');
});

test('builds project list and detail destinations from route params', () => {
  const params = { workspace: 'dev', cluster: 'host', namespace: 'demo' };
  assert.equal(
    getWorkloadPath(params, 'deployments'),
    '/dev/clusters/host/projects/demo/deployments',
  );
  assert.equal(
    getWorkloadPath(params, 'deployments', 'nginx'),
    '/dev/clusters/host/projects/demo/deployments/nginx',
  );
});
