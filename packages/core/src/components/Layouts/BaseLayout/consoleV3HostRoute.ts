/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { normalizeNativeResourceDetailPath } from './nativeResourceRoute';

export interface ConsoleV3HostLocation {
  pathname: string;
  search: string;
}

const EMBEDDED_PREFIX = '/consolev3';
const IGNORED_HOST_PATHS = new Set(['/', '/dashboard', '/login', '/workspaces', '/extensions']);

function isIgnoredHostPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return IGNORED_HOST_PATHS.has(trimmed);
}

/**
 * Map a V3 embed route (or Wujie location) onto the host React Router path.
 * Embed reports `/consolev3/...`; the host address bar must not keep that prefix.
 * The actions overlay boots at `/consolev3/dashboard` and must not yank the host home.
 */
export function toHostResourceLocation(
  pathOrRoute: string | { pathname?: string; search?: string } | null | undefined,
): ConsoleV3HostLocation | null {
  if (!pathOrRoute) return null;

  let pathname = '';
  let search = '';
  if (typeof pathOrRoute === 'string') {
    const url = new URL(pathOrRoute, 'http://localhost');
    pathname = url.pathname;
    search = url.search;
  } else {
    pathname = pathOrRoute.pathname || '';
    search = pathOrRoute.search || '';
  }

  if (!pathname || pathname === EMBEDDED_PREFIX) return null;
  if (pathname.startsWith(`${EMBEDDED_PREFIX}/`)) {
    pathname = pathname.slice(EMBEDDED_PREFIX.length);
  }
  if (!pathname || isIgnoredHostPath(pathname)) return null;

  return {
    pathname: normalizeNativeResourceDetailPath(pathname),
    search,
  };
}
