export function getRepoManageAuthKey(search: string, hash = ''): 'app-repos' | 'manage-app' {
  return hash === '#global' ? 'manage-app' : 'app-repos';
}

export function getRepoManageActionParams(
  authKey: 'app-repos' | 'manage-app',
  params: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return authKey === 'manage-app' ? {} : params;
}

export function getRepoManageWorkspace(workspace?: string): string {
  return workspace || 'system-workspace';
}
