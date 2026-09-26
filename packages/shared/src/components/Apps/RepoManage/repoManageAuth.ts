export function getRepoManageAuthKey(search: string, hash = ''): 'app-repos' | 'manage-app' {
  return hash === '#global' ? 'manage-app' : 'app-repos';
}
