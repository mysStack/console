import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoDetailActionKeys, isRepoSyncInProgress } from './repoDetailActions';

test('shows incremental sync for every repository detail', () => {
  assert.deepEqual(getRepoDetailActionKeys(false), ['sync', 'edit', 'delete']);
});

test('adds full validation only for OCI repository detail', () => {
  assert.deepEqual(getRepoDetailActionKeys(true), ['sync', 'fullSync', 'edit', 'delete']);
});

test('keeps detail polling only while a repository sync is pending', () => {
  assert.equal(isRepoSyncInProgress('manualTrigger'), true);
  assert.equal(isRepoSyncInProgress('syncing'), true);
  assert.equal(isRepoSyncInProgress('successful'), false);
  assert.equal(isRepoSyncInProgress(undefined), false);
});
