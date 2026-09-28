import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRepoDetailActionKeys,
  hasRepoSyncCompleted,
  isRepoSyncInProgress,
} from './repoDetailActions';

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

test('identifies a successful terminal state after detail sync has started', () => {
  assert.equal(hasRepoSyncCompleted('syncing', 'successful'), true);
  assert.equal(hasRepoSyncCompleted('manualTrigger', 'successful'), true);
  assert.equal(hasRepoSyncCompleted('syncing', 'failed'), false);
  assert.equal(hasRepoSyncCompleted('successful', 'successful'), false);
});
