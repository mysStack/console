const assert = require('node:assert/strict');
const test = require('node:test');
let bridge = {};
try {
  bridge = require('./public/deploymentStandalone');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}
const origin = 'http://ks.test:30881';
const scope = '/consolev3/ws/clusters/host/projects/project-a';

test('standalone mode is scoped to a project Deployment entry', () => {
  assert.equal(typeof bridge.projectScope, 'function');
  assert.equal(bridge.projectScope(scope + '/deployments'), scope);
  assert.equal(bridge.projectScope(scope + '/deployments/app/env'), scope);
  assert.equal(bridge.projectScope(scope + '/secrets'), undefined);
  assert.equal(bridge.projectScope('/consolev3/clusters/host/deployments'), undefined);
});

test('Deployment and Pod details keep their existing SPA navigation', () => {
  assert.equal(typeof bridge.enhancedDestination, 'function');
  for (const path of ['/deployments', '/deployments/app/resource-status', '/pods/app-123']) {
    assert.equal(bridge.enhancedDestination(scope + path, origin, scope), undefined);
  }
});

test('other resources, projects and configuration references return to the host', () => {
  assert.equal(typeof bridge.enhancedDestination, 'function');
  assert.equal(
    bridge.enhancedDestination(scope + '/secrets?name=app#details', origin, scope),
    origin + '/ws/clusters/host/projects/project-a/secrets?name=app#details',
  );
  assert.equal(
    bridge.enhancedDestination(
      scope.replace('project-a', 'project-b') + '/deployments',
      origin,
      scope,
    ),
    origin + '/ws/clusters/host/projects/project-b/deployments',
  );
  assert.equal(
    bridge.enhancedDestination(scope + '/deployments/app/config-reference', origin, scope),
    origin + '/ws/clusters/host/projects/project-a/deployments/app/config-reference',
  );
});

test('the bridge leaves external and existing host links to the browser', () => {
  assert.equal(typeof bridge.enhancedDestination, 'function');
  assert.equal(
    bridge.enhancedDestination('https://external.test/consolev3/ws/deployments', origin, scope),
    undefined,
  );
  assert.equal(
    bridge.enhancedDestination('/ws/clusters/host/projects/project-a/secrets', origin, scope),
    undefined,
  );
});

test('enhanced detail links preserve the selected workspace, cluster, project and workload', () => {
  assert.equal(typeof bridge.detailLinks, 'function');
  assert.deepEqual(bridge.detailLinks(scope + '/deployments/app/env', origin), {
    detail: origin + '/ws/clusters/host/projects/project-a/deployments/app/resource-status',
    config: origin + '/ws/clusters/host/projects/project-a/deployments/app/config-reference',
  });
  assert.equal(bridge.detailLinks(scope + '/deployments', origin), undefined);
});

test('embedded Wujie pages do not install standalone navigation handlers', () => {
  assert.equal(typeof bridge.mount, 'function');
  const win = { __POWERED_BY_WUJIE__: true, location: { pathname: scope + '/deployments' } };
  assert.equal(bridge.mount(win), false);
});

test('login can return to a standalone project Deployment list or detail', () => {
  global.SERVER_ROOT = __dirname;
  const { isValidReferer } = require('./libs/utils');
  for (const path of [scope + '/deployments', scope + '/deployments/app/env']) {
    assert.equal(isValidReferer(path), true, path);
    assert.equal(isValidReferer(encodeURIComponent(path)), true, path);
  }
  for (const path of [
    scope + '/secrets',
    '/consolev3/dashboard',
    'https://external.test' + scope + '/deployments',
    '//external.test' + scope + '/deployments',
  ]) {
    assert.equal(isValidReferer(path), false, path);
  }
});

test('enabled configuration references use a native deep link in the current detail tab', () => {
  const links = bridge.detailLinks(scope + '/deployments/app/env', origin, true);
  assert.equal(links.config, origin + scope + '/deployments/app/env?enhancement=config-reference');
});
