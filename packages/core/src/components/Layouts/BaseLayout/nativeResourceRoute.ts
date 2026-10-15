const NATIVE_PROJECT_RESOURCE_DETAIL =
  /(\/projects\/[^/]+\/(?:configmaps|secrets)\/[^/]+)(?=$|[?#])/;
const NATIVE_PROJECT_RESOURCE_STATUS =
  /(\/projects\/[^/]+\/(?:deployments|services|volumes|statefulsets|daemonsets)\/[^/]+)(?=$|[?#])/;

export function normalizeNativeResourceDetailPath(pathname: string): string {
  const match = pathname.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return pathname;
  const normalizedPath = match[1]
    .replace(NATIVE_PROJECT_RESOURCE_DETAIL, '$1/detail')
    .replace(NATIVE_PROJECT_RESOURCE_STATUS, '$1/resource-status');
  return `${normalizedPath}${match[2] || ''}`;
}

export function shouldReplaceNativeResourceRoute(currentPath: string, nextPath: string): boolean {
  return normalizeNativeResourceDetailPath(currentPath) === nextPath;
}
