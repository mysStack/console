const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
global.SERVER_ROOT = path.resolve(__dirname, '..');
const { isValidReferer } = require('./utils');
const detail =
  '/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments/api.v2/resource-status';

test('anonymous Deployment enhancement links retain their explicit enhancement query', () => {
  assert.equal(isValidReferer(detail + '?enhancement=config-reference'), true);
  assert.equal(isValidReferer(encodeURIComponent(detail + '?enhancement=config-reference')), true);
});

test('invalid or ambiguous return paths cannot redirect out of the console or crash login', () => {
  for (const value of [
    'https://external.invalid/projects',
    '//external.invalid/projects',
    '/\\external.invalid/projects',
    '/login',
    '/logout',
    '/oauth/login/provider',
    '/password/confirm',
    '/%2fexternal.invalid',
    '/project-console/../logout',
    '/project-console/dashboard?next=https://external.invalid',
    detail + '?enhancement=config-reference&enhancement=other',
    detail + '?enhancement=other',
    detail + '%0d%0aLocation:elsewhere',
    '%',
    '%252f%252fexternal.invalid',
    '/consolev3/dashboard',
    '/consolev3/dev-workspace/clusters/host/projects/dev-wes/secrets',
  ]) {
    assert.equal(isValidReferer(value), false, value);
  }
});

test('existing full-console bookmarks and scoped navigator pagination remain valid', () => {
  for (const value of [
    '/dashboard',
    '/workspaces/system-workspace/app-repos#global',
    '/clusters/host/projects?name=test',
    '/project-console/dashboard',
    '/project-console/workspaces/dev-workspace/projects?cluster=host&page=2',
    '/project-console/dev-workspace/clusters/host/projects/dev-wes/overview',
  ])
    assert.equal(isValidReferer(value), true, value);
});
