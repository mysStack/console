import assert from 'node:assert/strict';
import test from 'node:test';

import { getConsoleV3DetailPath, getConsoleV3DetailUrl, getConsoleV3ProjectPrefix } from './route';

test('builds the project-relative Wujie route used by the preloaded V3 app', () => {
  assert.equal(
    getConsoleV3ProjectPrefix({
      workspace: 'test-workspace',
      cluster: 'host',
      namespace: 'test-wes',
    }),
    '/test-workspace/clusters/host/projects/test-wes',
  );
});

test('boots the cached V3 app at the stable workload root', () => {
  assert.equal(
    getConsoleV3DetailUrl({
      projectPrefix: '/test-workspace/clusters/host/projects/test-wes',
      name: 'ams-server',
    }),
    '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
  );
});

test('converts a direct host sub-route to the mounted V3 browser path', () => {
  assert.equal(
    getConsoleV3DetailPath({
      projectPrefix: '/test-workspace/clusters/host/projects/test-wes',
      name: 'ams-server',
      hostPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
      hostDetailPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
    }),
    '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
  );
});
