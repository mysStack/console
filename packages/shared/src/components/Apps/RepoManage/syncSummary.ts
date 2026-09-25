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
  const nextNames = names.filter(name => {
    const record = records.find(item => item.metadata.name === name);
    return record && isRepoSyncInProgress(record.status?.state);
  });

  // DataTable notifies consumers whenever its formatted data changes. Keep the
  // previous reference when polling has not changed the pending set so React
  // does not schedule an update on every render.
  if (
    nextNames.length === names.length &&
    nextNames.every((name, index) => name === names[index])
  ) {
    return names;
  }

  return nextNames;
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
