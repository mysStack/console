/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { toHostResourceLocation } from './consoleV3HostRoute';

test('strips /consolev3 and maps a deployment click onto the native detail route', () => {
  assert.deepEqual(
    toHostResourceLocation(
      '/consolev3/dev-workspace/clusters/host/projects/dev-wms/deployments/wms-pod-collating',
    ),
    {
      pathname:
        '/dev-workspace/clusters/host/projects/dev-wms/deployments/wms-pod-collating/resource-status',
      search: '',
    },
  );
  assert.deepEqual(
    toHostResourceLocation(
      '/consolev3/dev-workspace/clusters/host/projects/dev-wms/deployments/wms-pod-collating/resource-status',
    ),
    {
      pathname:
        '/dev-workspace/clusters/host/projects/dev-wms/deployments/wms-pod-collating/resource-status',
      search: '',
    },
  );
});

test('keeps list routes as lists and accepts Wujie location objects', () => {
  assert.deepEqual(
    toHostResourceLocation('/consolev3/dev-workspace/clusters/host/projects/dev-wms/deployments'),
    {
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/deployments',
      search: '',
    },
  );
  assert.deepEqual(
    toHostResourceLocation({
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/services/example',
      search: '?tab=events',
    }),
    {
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/services/example/resource-status',
      search: '?tab=events',
    },
  );
  assert.equal(toHostResourceLocation('/consolev3'), null);
  assert.equal(toHostResourceLocation(''), null);
});
