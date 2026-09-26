import type { RepoData } from '@ks-console/shared';

type RepoSyncStatus = NonNullable<NonNullable<RepoData['status']>['sync']>;

export type SyncDiagnosticItem = {
  key: keyof RepoSyncStatus;
  value: string | number;
};

export function getSyncDiagnosticItems(sync?: RepoSyncStatus): SyncDiagnosticItem[] {
  if (!sync) {
    return [];
  }

  const keys: Array<keyof RepoSyncStatus> = [
    'startedAt',
    'completedAt',
    'durationSeconds',
    'validChartVersionCount',
    'remoteTagCount',
    'skippedArtifactCount',
    'failedTagCount',
    'requestCount',
    'cacheHitCount',
    'lastError',
  ];

  return keys.reduce<SyncDiagnosticItem[]>((items, key) => {
    const value = sync[key];
    if (value !== undefined && value !== '') {
      items.push({ key, value });
    }
    return items;
  }, []);
}
