import type { RepoData } from '../../../types';

type RepoSyncStatus = NonNullable<NonNullable<RepoData['status']>['sync']>;

export function isRepoSyncInProgress(state: string | undefined): boolean {
  return state === 'manualTrigger' || state === 'syncing';
}

export function getRepoStatusDisplayState(state: string | undefined): string {
  return state === 'manualTrigger' ? 'syncing' : state || 'syncing';
}

export function getPendingRepoSyncNames(
  names: string[],
  records: Array<{ metadata: { name: string }; status?: { state?: string } }>,
): string[] {
  return names.filter(name => {
    const record = records.find(item => item.metadata.name === name);
    return record && isRepoSyncInProgress(record.status?.state);
  });
}

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

  if (state === 'manualTrigger') {
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
