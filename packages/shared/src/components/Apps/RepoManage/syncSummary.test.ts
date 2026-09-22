import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoSyncSummary } from './syncSummary';

test('returns no summary for repositories without sync status', () => {
  assert.equal(getRepoSyncSummary(undefined, 'successful'), undefined);
});

test('uses the sync start time while a repository is syncing', () => {
  assert.deepEqual(getRepoSyncSummary({ startedAt: '2026-09-22T08:30:00Z' }, 'syncing'), {
    key: 'REPO_SYNC_STARTED_AT',
    values: { time: '2026-09-22T08:30:00Z' },
  });
});

test('does not show a completed summary while a repository is queued for manual sync', () => {
  assert.equal(
    getRepoSyncSummary(
      { startedAt: '2026-09-22T08:30:00Z', durationSeconds: 12, validChartVersionCount: 7 },
      'manualTrigger',
    ),
    undefined,
  );
});

test('summarizes completed HTTPS sync duration and valid versions', () => {
  assert.deepEqual(
    getRepoSyncSummary({ durationSeconds: 12, validChartVersionCount: 7 }, 'successful'),
    { key: 'REPO_SYNC_SUMMARY', values: { duration: 12, count: 7 } },
  );
});

test('keeps OCI summaries short and excludes last errors', () => {
  const summary = getRepoSyncSummary(
    {
      durationSeconds: 12,
      validChartVersionCount: 7,
      remoteTagCount: 8,
      skippedArtifactCount: 1,
      lastError: 'https://user:token@example.test should not be shown',
    },
    'failed',
  );

  assert.deepEqual(summary, { key: 'REPO_SYNC_SUMMARY', values: { duration: 12, count: 7 } });
  assert.doesNotMatch(JSON.stringify(summary), /user|token|example\.test/);
});
