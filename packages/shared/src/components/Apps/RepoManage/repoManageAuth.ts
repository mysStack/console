export function getRepoManageAuthKey(search: string): 'app-repos' | 'manage-app' {
  return new URLSearchParams(search).get('global') === 'true' ? 'manage-app' : 'app-repos';
}
