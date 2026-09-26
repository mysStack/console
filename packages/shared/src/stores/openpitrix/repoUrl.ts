function getRepoBaseUrl(workspace: string, repoName: string): string {
  return `kapis/application.kubesphere.io/v2/workspaces/${workspace}/repos/${repoName}`;
}

export function getRepoDetailUrl(workspace: string, repoName: string): string {
  return getRepoBaseUrl(workspace, repoName);
}

export function getRepoEventsUrl(workspace: string, repoName: string): string {
  return `${getRepoBaseUrl(workspace, repoName)}/events`;
}
