export function getConsoleV3ProjectUrl(
  workspace?: string,
  cluster?: string,
  namespace?: string,
): string {
  return `/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}`;
}
