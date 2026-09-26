export function getRepoManageAuthKey(
  search: string,
  hash = '',
  pathname = '',
  workspace = '',
): 'app-repos' | 'manage-app' {
  if (hash === '#global' || pathname.startsWith('/apps-manage')) {
    return 'manage-app';
  }

  // The legacy global repository route redirects to this workspace URL and
  // drops the hash. Keep using the platform-level permission in that case.
  if (workspace === 'system-workspace' && pathname.endsWith('/app-repos')) {
    return 'manage-app';
  }

  return 'app-repos';
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
