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
      hash: '',
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
      hash: '',
    },
  );
});

test('keeps list routes as lists and accepts Wujie location objects', () => {
  assert.deepEqual(
    toHostResourceLocation('/consolev3/dev-workspace/clusters/host/projects/dev-wms/deployments'),
    {
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/deployments',
      search: '',
      hash: '',
    },
  );
  assert.deepEqual(
    toHostResourceLocation({
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/services/example',
      search: '?tab=events',
      hash: '',
    }),
    {
      pathname: '/dev-workspace/clusters/host/projects/dev-wms/services/example/resource-status',
      search: '?tab=events',
      hash: '',
    },
  );
  assert.equal(toHostResourceLocation('/consolev3'), null);
  assert.equal(toHostResourceLocation(''), null);
});

test('preserves the entire child location including a cleared query or hash', () => {
  assert.deepEqual(toHostResourceLocation('/consolev3/clusters/host/nodes?sort=name#details'), {
    pathname: '/clusters/host/nodes',
    search: '?sort=name',
    hash: '#details',
  });
  assert.deepEqual(
    toHostResourceLocation({ pathname: '/clusters/host/nodes', search: '', hash: '#detail' }),
    {
      pathname: '/clusters/host/nodes',
      search: '',
      hash: '#detail',
    },
  );
});

test('follows actual child POP and REPLACE but rejects a stale boot or inactive page', () => {
  const list = '/dev-workspace/clusters/host/projects/dev-wms/deployments';
  const detail = `${list}/wms-pod-collating/resource-status`;
  for (const action of ['POP', 'REPLACE']) {
    assert.equal(shouldFollowConsoleV3Route(detail, list, action, detail), true);
    assert.equal(shouldFollowConsoleV3Route(detail, list, action, list), false);
    assert.equal(
      shouldFollowConsoleV3Route('/clusters/host/overview', list, action, detail),
      false,
    );
  }
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
