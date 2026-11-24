/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Host routes that still mount Wujie for the project resource list.
 * Native V4 pages (overview, configmaps, secrets, serviceaccounts, …) must not
 * trigger a V3 download on boot.
 */
const V3_PROJECT_LIST_PATH =
  /^\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+\/(deployments|statefulsets|daemonsets|pods|jobs|cronjobs|s2ibuilders|services|ingresses|volumes|volume-snapshots|networkpolicies|roles|log-collections|gateways|alert-rules|alerts|composing|grayrelease|configurations|microservices|microservicegateways|servicerouting)\/?$/;

export function isConsoleV3ProjectListPath(pathname: string): boolean {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  return V3_PROJECT_LIST_PATH.test(path);
}

export function shouldPreloadConsoleV3(pathname: string): boolean {
  return isConsoleV3ProjectListPath(pathname);
}

export function resolveConsoleV3PreloadPath(pathname: string): string | null {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  if (!isConsoleV3ProjectListPath(path)) {
    return null;
  }
  return `/consolev3${path}`.replace(/\/$/, '');
}

export function resolveConsoleV3PreloadUrl(
  pathname: string,
  host: string = typeof window === 'undefined' ? '' : window.location.host,
): string {
  const preloadPath = resolveConsoleV3PreloadPath(pathname);
  if (!preloadPath) {
    return '';
  }
  return `//${host}${preloadPath}`;
}
