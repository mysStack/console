/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldFollowConsoleV3Route, toHostResourceLocation } from './consoleV3HostRoute';

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

test('keeps a direct detail URL when the child reports its boot list', () => {
  const detail =
    '/dev-workspace/clusters/host/projects/dev-wms/deployments/wms-pod-collating/resource-status';
  const list = '/dev-workspace/clusters/host/projects/dev-wms/deployments';
  assert.equal(shouldFollowConsoleV3Route(detail, list), false);
  assert.equal(shouldFollowConsoleV3Route(detail, list, 'POP'), false);
  assert.equal(shouldFollowConsoleV3Route(detail, list, 'REPLACE'), false);
  assert.equal(shouldFollowConsoleV3Route(detail, list, 'PUSH'), true);
  assert.equal(
    shouldFollowConsoleV3Route(list, `${list}/wms-pod-collating/resource-status`, 'PUSH'),
    true,
  );
  assert.equal(shouldFollowConsoleV3Route(list, list), true);
});

test('does not follow the actions app landing page back to the host home', () => {
  assert.equal(toHostResourceLocation('/consolev3/dashboard'), null);
  assert.equal(toHostResourceLocation('/consolev3/'), null);
  assert.equal(toHostResourceLocation('/dashboard'), null);
  assert.equal(toHostResourceLocation('/'), null);
  assert.equal(toHostResourceLocation({ pathname: '/dashboard', search: '' }), null);
  assert.equal(toHostResourceLocation('/login'), null);
});
