/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const DEFAULT_PRELOAD_PATH = '/consolev3/dashboard';

/**
 * Only known V3-embedded project resource lists. Paths like `/overview` or
 * project settings are native V4 — preloading them as consolev3 would waste a
 * cold download on pages that never mount the sandbox.
 */
const V3_PROJECT_LIST_PATH =
  /^\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+\/(deployments|statefulsets|daemonsets|pods|services|ingresses|jobs|cronjobs|configmaps|secrets|persistentvolumeclaims|serviceaccounts|roles)\/?$/;

export function resolveConsoleV3PreloadPath(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  if (path.startsWith('/login')) {
    return DEFAULT_PRELOAD_PATH;
  }
  if (V3_PROJECT_LIST_PATH.test(path)) {
    return `/consolev3${path}`.replace(/\/$/, '') || DEFAULT_PRELOAD_PATH;
  }
  return DEFAULT_PRELOAD_PATH;
}

export function resolveConsoleV3PreloadUrl(
  pathname: string,
  host: string = typeof window === 'undefined' ? '' : window.location.host,
): string {
  return `//${host}${resolveConsoleV3PreloadPath(pathname)}`;
}
