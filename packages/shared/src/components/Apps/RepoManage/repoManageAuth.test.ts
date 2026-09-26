import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoManageActionParams, getRepoManageAuthKey } from './repoManageAuth';

test('uses platform app management permissions for the component-dock repository route', () => {
  assert.equal(getRepoManageAuthKey('', '#global'), 'manage-app');
});

test('uses workspace repository permissions for workspace repository pages', () => {
  assert.equal(getRepoManageAuthKey(''), 'app-repos');
});

test('does not pass workspace scope to global repository permission checks', () => {
  assert.deepEqual(getRepoManageActionParams('manage-app', { workspace: 'system-workspace' }), {});
});
