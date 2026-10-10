import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getConsoleV3DetailUrl,
  getConsoleV3ProjectPrefix,
  getHostRouteFromEmbeddedRoute,
} from './route';

test('builds an absolute V3 project prefix for a hard-refreshed project route', () => {
  assert.equal(
    getConsoleV3ProjectPrefix({
      host: '192.168.2.131:30880',
      workspace: 'test-workspace',
      cluster: 'host',
      namespace: 'test-wes',
    }),
    '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes',
  );
});

test('maps an embedded V3 detail route back to the host route', () => {
  assert.equal(
    getHostRouteFromEmbeddedRoute(
      '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
      '/test-workspace/clusters/host/projects/test-wes',
    ),
    '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
  );
});

test('ignores embedded routes outside the current project', () => {
  assert.equal(
    getHostRouteFromEmbeddedRoute(
      '/consolev3/other-workspace/clusters/host/projects/other/deployments/ams-server/env',
      '/test-workspace/clusters/host/projects/test-wes',
    ),
    null,
  );
});

test('preserves a host detail sub-route when bootstrapping the embedded page', () => {
  assert.equal(
    getConsoleV3DetailUrl({
      projectPrefix:
        '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes',
      name: 'ams-server',
      hostPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
      hostDetailPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
    }),
    [
      '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes',
      '/deployments/ams-server/env',
    ].join(''),
  );
});
