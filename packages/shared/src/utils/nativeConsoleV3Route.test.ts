import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptsNativeConsoleV3Route } from './nativeConsoleV3Route';

const detail = '/dev-workspace/clusters/host/projects/example/deployments/web';
test('native detail activation ignores delayed dashboard and list events', () => {
  const state = {
    visible: true,
    suppressed: false,
    currentPath: '/consolev3' + detail + '/resource-status',
    expectedPath: detail,
  };
  assert.equal(
    acceptsNativeConsoleV3Route({ ...state, incomingPath: detail + '/resource-status' }),
    true,
  );
  assert.equal(
    acceptsNativeConsoleV3Route({ ...state, incomingPath: detail.replace(/\/web$/, '') }),
    false,
  );
  assert.equal(acceptsNativeConsoleV3Route({ ...state, incomingPath: '/dashboard' }), false);
});
test('a parked or programmatically updated document cannot navigate the host', () => {
  const state = { incomingPath: detail, currentPath: detail, expectedPath: '' };
  assert.equal(acceptsNativeConsoleV3Route({ ...state, visible: false, suppressed: false }), false);
  assert.equal(acceptsNativeConsoleV3Route({ ...state, visible: true, suppressed: true }), false);
});
test('a user navigation is accepted after its child history has changed', () => {
  const target = '/dev-workspace/clusters/host/projects/other/services';
  assert.equal(
    acceptsNativeConsoleV3Route({
      incomingPath: target,
      currentPath: '/consolev3' + target,
      expectedPath: '',
      visible: true,
      suppressed: false,
    }),
    true,
  );
});
