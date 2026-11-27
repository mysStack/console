/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { normalizeNativeResourceDetailPath } from './nativeResourceRoute';

export interface ConsoleV3HostLocation {
  pathname: string;
  search: string;
  hash: string;
}

const EMBEDDED_PREFIX = '/consolev3';
const IGNORED_HOST_PATHS = new Set(['/', '/dashboard', '/login', '/workspaces', '/extensions']);

function isIgnoredHostPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return IGNORED_HOST_PATHS.has(trimmed);
}

function stripTrailingSlash(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function isHostOnDeeperResource(currentPath: string, nextPath: string): boolean {
  const current = stripTrailingSlash(currentPath);
  const next = stripTrailingSlash(nextPath);
  return Boolean(current && next && current !== next && current.startsWith(`${next}/`));
}

/**
 * Follow list→detail and user breadcrumbs (PUSH). Ignore the cached list URL
 * that a detail embed boots on, and ignore popstate/replace of that list while
 * the host is already on the resource.
 */
export function shouldFollowConsoleV3Route(
  currentPath: string,
  nextPath: string,
  action?: string | null,
  previousRoute?: string,
): boolean {
  if (action === 'INITIAL') return false;
  if (previousRoute !== undefined) {
    const previous = toHostResourceLocation(previousRoute);
    return Boolean(
      previous && previous.pathname === normalizeNativeResourceDetailPath(currentPath),
    );
  }
  if (!currentPath || !nextPath || currentPath === nextPath) {
    return true;
  }
  if (isHostOnDeeperResource(currentPath, nextPath) && action !== 'PUSH') {
    return false;
  }
  return true;
}

/**
 * Map a V3 embed route (or Wujie location) onto the host React Router path.
 * Embed reports `/consolev3/...`; the host address bar must not keep that prefix.
 * The actions overlay boots at `/consolev3/dashboard` and must not yank the host home.
 */
export function toHostResourceLocation(
  pathOrRoute: string | { pathname?: string; search?: string; hash?: string } | null | undefined,
): ConsoleV3HostLocation | null {
  if (!pathOrRoute) return null;

  let pathname = '';
  let search = '';
  let hash = '';
  if (typeof pathOrRoute === 'string') {
    const url = new URL(pathOrRoute, 'http://localhost');
    pathname = url.pathname;
    search = url.search;
    hash = url.hash;
  } else {
    pathname = pathOrRoute.pathname || '';
    search = pathOrRoute.search || '';
    hash = pathOrRoute.hash || '';
  }

  if (!pathname || pathname === EMBEDDED_PREFIX) return null;
  if (pathname.startsWith(`${EMBEDDED_PREFIX}/`)) {
    pathname = pathname.slice(EMBEDDED_PREFIX.length);
  }
  if (!pathname || isIgnoredHostPath(pathname)) return null;

  return {
    pathname: normalizeNativeResourceDetailPath(pathname),
    search,
    hash,
  };
}
