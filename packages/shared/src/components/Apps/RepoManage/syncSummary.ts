import type { RepoData } from '../../../types';

type RepoSyncStatus = NonNullable<NonNullable<RepoData['status']>['sync']>;

export type RepoSyncSummaryValue =
  | { key: 'REPO_SYNC_STARTED_AT'; values: { time: string } }
  | { key: 'REPO_SYNC_SUMMARY'; values: { duration: number; count: number } };

export function getRepoSyncSummary(
  sync: RepoSyncStatus | undefined,
  state: string | undefined,
): RepoSyncSummaryValue | undefined {
  if (!sync) {
    return undefined;
  }

  if (state === 'syncing' && sync.startedAt) {
    return { key: 'REPO_SYNC_STARTED_AT', values: { time: sync.startedAt } };
  }

  if (sync.durationSeconds !== undefined && sync.validChartVersionCount !== undefined) {
    return {
      key: 'REPO_SYNC_SUMMARY',
      values: { duration: sync.durationSeconds, count: sync.validChartVersionCount },
    };
  }

  return undefined;
}
