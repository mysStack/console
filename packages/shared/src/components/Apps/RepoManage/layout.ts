export type RepoActionKey = 'sync' | 'fullSync' | 'edit' | 'delete';

export function isRepoActionVisible(
  action: RepoActionKey,
  isWorkspaceRepo: boolean,
  isOCIRepo: boolean,
): boolean {
  if (!isWorkspaceRepo) {
    return false;
  }

  return action !== 'fullSync' || isOCIRepo;
}
