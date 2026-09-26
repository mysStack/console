import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoManageAuthKey } from './repoManageAuth';

test('uses platform app management permissions for the component-dock repository route', () => {
  assert.equal(getRepoManageAuthKey('', '#global'), 'manage-app');
});

test('uses workspace repository permissions for workspace repository pages', () => {
  assert.equal(getRepoManageAuthKey(''), 'app-repos');
});
