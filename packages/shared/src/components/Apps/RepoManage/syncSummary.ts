import type { RepoData } from '../../../types';

type RepoSyncStatus = NonNullable<NonNullable<RepoData['status']>['sync']>;

export type RepoPresentationState = 'ready' | 'syncing' | 'failed' | 'stale';

type RepoStatusValue = {
  state?: string;
  sync?: RepoSyncStatus;
  lastUpdateTime?: string;
};

export function getRepoStatusState(status: string | { state?: string } | undefined): string {
  if (typeof status === 'string') {
    return status;
  }

  return typeof status?.state === 'string' ? status.state : 'syncing';
}

export function getRepoPresentationState(
  status: string | RepoStatusValue | undefined,
  syncPeriod?: number | string,
  now = new Date(),
): RepoPresentationState {
  const state = getRepoStatusState(status);
  if (state === 'manualTrigger' || state === 'syncing') {
    return 'syncing';
  }
  if (state === 'failed') {
    return 'failed';
  }

  const statusValue = typeof status === 'string' ? undefined : status;
  const period = Number(syncPeriod || 0);
  const completedAt = statusValue?.sync?.completedAt || statusValue?.lastUpdateTime;
  if (state === 'successful' && period > 0 && completedAt) {
    const completedTime = new Date(completedAt).getTime();
    if (Number.isFinite(completedTime) && now.getTime() - completedTime > period * 2000) {
      return 'stale';
    }
  }

  return 'ready';
}

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

export function getSuccessfulRepoSyncNames(
  names: string[],
  records: Array<{ metadata: { name: string }; status?: { state?: string } }>,
): string[] {
  return names.filter(name =>
    records.some(item => item.metadata.name === name && item.status?.state === 'successful'),
  );
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
