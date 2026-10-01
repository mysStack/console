import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_NATIVE_WORKLOAD_FORM,
  WORKLOAD_ROUTE_PATHS,
  getWorkloadCreateUrl,
  getWorkloadEditUrl,
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

test('builds native create and edit URLs by default', () => {
  const params = { workspace: 'dev', cluster: 'host', namespace: 'demo space' };

  assert.equal(DEFAULT_NATIVE_WORKLOAD_FORM, true);
  assert.equal(
    getWorkloadCreateUrl('deployments', params),
    '/dev/clusters/host/projects/demo%20space/deployments/new',
  );
  assert.equal(
    getWorkloadEditUrl('deployments', params, true, 'nginx canary'),
    '/dev/clusters/host/projects/demo%20space/deployments/nginx%20canary/edit',
  );
});

test('falls back to the existing V3 URL when native forms are disabled', () => {
  const params = { workspace: 'dev', cluster: 'host', namespace: 'demo/blue' };

  assert.equal(
    getWorkloadCreateUrl('statefulsets', params, false),
    '/consolev3/dev/clusters/host/projects/demo%2Fblue/statefulsets',
  );
  assert.equal(
    getWorkloadEditUrl('daemonsets', params, false, 'node/a'),
    '/consolev3/dev/clusters/host/projects/demo%2Fblue/daemonsets/node%2Fa',
  );
});
