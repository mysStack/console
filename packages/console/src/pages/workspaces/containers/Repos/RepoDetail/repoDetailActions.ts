export type RepoDetailActionKey = 'sync' | 'fullSync' | 'edit' | 'delete';

export function getRepoDetailActionKeys(isOCIRepo: boolean): RepoDetailActionKey[] {
  return isOCIRepo ? ['sync', 'fullSync', 'edit', 'delete'] : ['sync', 'edit', 'delete'];
}

export function isRepoSyncInProgress(state?: string): boolean {
  return state === 'manualTrigger' || state === 'syncing';
}
