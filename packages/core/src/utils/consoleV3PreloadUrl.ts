/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const DEFAULT_PRELOAD_PATH = '/consolev3/dashboard';

/**
 * Project-scoped host routes under `/:workspace/clusters/:cluster/projects/:namespace/...`
 * map 1:1 into the embedded V3 console. Prefetching `/consolev3/dashboard` while the
 * user lands on a list URL forces an extra in-sandbox navigation before the first row.
 */
const PROJECT_EMBED_PATH = /^\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+(?:\/[^/]+)*(?:\/)?$/;

export function resolveConsoleV3PreloadPath(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  if (path.startsWith('/login')) {
    return DEFAULT_PRELOAD_PATH;
  }
  if (PROJECT_EMBED_PATH.test(path)) {
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
