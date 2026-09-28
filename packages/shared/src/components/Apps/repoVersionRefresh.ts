export const REPOSITORY_SYNC_COMPLETED_EVENT = 'ks:application-repository-synced';

export function shouldRefreshVersionsForRepositorySync(
  completedRepository: string | undefined,
  applicationRepositoryNames: string[],
): boolean {
  return Boolean(completedRepository && applicationRepositoryNames.includes(completedRepository));
}
