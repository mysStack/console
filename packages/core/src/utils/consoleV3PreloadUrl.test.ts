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
} from './consoleV3PreloadUrl';

test('maps a project list pathname onto the matching consolev3 preload path', () => {
  assert.equal(
    resolveConsoleV3PreloadPath('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    '/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments',
  );
  assert.equal(
    isConsoleV3ProjectListPath('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    true,
  );
  assert.equal(
    isConsoleV3ProjectListPath('/dev-workspace/clusters/host/projects/dev-wes/overview'),
    false,
  );
});

test('keeps dashboard preload for login, native V4 project pages, and other routes', () => {
  assert.equal(resolveConsoleV3PreloadPath('/login'), '/consolev3/dashboard');
  assert.equal(resolveConsoleV3PreloadPath('/workspaces'), '/consolev3/dashboard');
  assert.equal(resolveConsoleV3PreloadPath('/clusters/host/nodes'), '/consolev3/dashboard');
  assert.equal(
    resolveConsoleV3PreloadPath('/dev-workspace/clusters/host/projects/dev-wes/overview'),
    '/consolev3/dashboard',
  );
  assert.equal(
    resolveConsoleV3PreloadPath('/dev-workspace/clusters/host/projects/dev-wes/base-info'),
    '/consolev3/dashboard',
  );
});

test('builds an absolute wujie preload URL for the current host', () => {
  assert.equal(
    resolveConsoleV3PreloadUrl(
      '/dev-workspace/clusters/host/projects/dev-wes/configmaps',
      '192.168.2.131:30881',
    ),
    '//192.168.2.131:30881/consolev3/dev-workspace/clusters/host/projects/dev-wes/configmaps',
  );
});
