import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoCredentialItems, normalizeRepoCredentialWorkspace } from './repoCredential';

test('uses the system workspace for global repository credentials', () => {
  assert.equal(normalizeRepoCredentialWorkspace(''), 'system-workspace');
  assert.equal(normalizeRepoCredentialWorkspace(undefined), 'system-workspace');
  assert.equal(normalizeRepoCredentialWorkspace('test-workspace'), 'test-workspace');
});

test('normalizes direct and legacy wrapped credential list responses', () => {
  const items = [{ metadata: { name: 'harbor-prod' } }];

  assert.deepEqual(getRepoCredentialItems({ items }), items);
  assert.deepEqual(getRepoCredentialItems({ data: { items } }), items);
  assert.deepEqual(getRepoCredentialItems(items), items);
  assert.deepEqual(getRepoCredentialItems(undefined), []);
});
