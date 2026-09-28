import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { isRepoActionVisible } from './layout';

const repoManageSource = readFileSync(
  'packages/shared/src/components/Apps/RepoManage/index.tsx',
  'utf8',
);

test('keeps repository actions scoped to workspace-owned repositories', () => {
  assert.equal(isRepoActionVisible('sync', false, false), false);
  assert.equal(isRepoActionVisible('edit', false, false), false);
  assert.equal(isRepoActionVisible('delete', false, false), false);
});

test('shows full validation only for workspace-owned OCI repositories', () => {
  assert.equal(isRepoActionVisible('fullSync', true, true), true);
  assert.equal(isRepoActionVisible('fullSync', true, false), false);
  assert.equal(isRepoActionVisible('fullSync', false, true), false);
});

test('keeps incremental sync, edit, and delete available for workspace repositories', () => {
  assert.equal(isRepoActionVisible('sync', true, false), true);
  assert.equal(isRepoActionVisible('edit', true, false), true);
  assert.equal(isRepoActionVisible('delete', true, false), true);
});

test('reduces secondary table columns on narrow screens', () => {
  assert.match(repoManageSource, /@media \(max-width: 640px\)/);
  assert.match(repoManageSource, /nth-child\(4\)/);
});
