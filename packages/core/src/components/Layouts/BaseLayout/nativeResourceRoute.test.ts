import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeNativeResourceDetailPath } from './nativeResourceRoute';

test('normalizes project ConfigMap and Secret V3 routes to native detail routes', () => {
  assert.equal(
    normalizeNativeResourceDetailPath(
      '/test-workspace/clusters/host/projects/test-wes/configmaps/example',
    ),
    '/test-workspace/clusters/host/projects/test-wes/configmaps/example/detail',
  );
  assert.equal(
    normalizeNativeResourceDetailPath(
      '/test-workspace/clusters/host/projects/test-wes/secrets/example?tab=data',
    ),
    '/test-workspace/clusters/host/projects/test-wes/secrets/example/detail?tab=data',
  );
});

test('normalizes project Deployment V3 routes to the native resource status route', () => {
  assert.equal(
    normalizeNativeResourceDetailPath(
      '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server',
    ),
    '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server/resource-status',
  );
  assert.equal(
    normalizeNativeResourceDetailPath(
      '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server?tab=events',
    ),
    '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server/resource-status?tab=events',
  );
});

test('leaves list, history, and non-project V3 routes unchanged', () => {
  assert.equal(
    normalizeNativeResourceDetailPath('/test-workspace/clusters/host/projects/test-wes/configmaps'),
    '/test-workspace/clusters/host/projects/test-wes/configmaps',
  );
  assert.equal(
    normalizeNativeResourceDetailPath(
      '/test-workspace/clusters/host/projects/test-wes/configmaps/example/detail',
    ),
    '/test-workspace/clusters/host/projects/test-wes/configmaps/example/detail',
  );
  assert.equal(
    normalizeNativeResourceDetailPath('/clusters/host/configmaps/example'),
    '/clusters/host/configmaps/example',
  );
});
