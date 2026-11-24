/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import test from 'node:test';

import {
  isConsoleV3ProjectListPath,
  resolveConsoleV3PreloadPath,
  resolveConsoleV3PreloadUrl,
  shouldPreloadConsoleV3,
} from './consoleV3PreloadUrl';

const listPath = '/dev-workspace/clusters/host/projects/dev-wes/deployments';

test('project V3 list paths preload the matching consolev3 URL', () => {
  assert.equal(isConsoleV3ProjectListPath(listPath), true);
  assert.equal(shouldPreloadConsoleV3(listPath), true);
  assert.equal(
    resolveConsoleV3PreloadPath(listPath),
    '/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments',
  );
  assert.equal(
    shouldPreloadConsoleV3('/dev-workspace/clusters/host/projects/dev-wes/volumes'),
    true,
  );
  assert.equal(
    shouldPreloadConsoleV3('/dev-workspace/clusters/host/projects/dev-wes/ingresses'),
    true,
  );
});

test('native V4 pages do not preload V3', () => {
  const nativePaths = [
    '/login',
    '/workspaces',
    '/dashboard',
    '/clusters/host/nodes',
    '/dev-workspace/clusters/host/projects/dev-wes/overview',
    '/dev-workspace/clusters/host/projects/dev-wes/base-info',
    '/dev-workspace/clusters/host/projects/dev-wes/configmaps',
    '/dev-workspace/clusters/host/projects/dev-wes/secrets',
    '/dev-workspace/clusters/host/projects/dev-wes/serviceaccounts',
  ];
  for (const path of nativePaths) {
    assert.equal(shouldPreloadConsoleV3(path), false, path);
    assert.equal(resolveConsoleV3PreloadPath(path), null, path);
  }
});

test('builds an absolute wujie preload URL for the current host', () => {
  assert.equal(
    resolveConsoleV3PreloadUrl(listPath, '192.168.2.131:30886'),
    '//192.168.2.131:30886/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments',
  );
});
