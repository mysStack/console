export type ConsoleV3Phase =
  | 'beforeMount'
  | 'afterMount'
  | 'activated'
  | 'render'
  | 'deactivated'
  | 'beforeUnmount'
  | 'afterUnmount';

const getPathname = (url: string): string => {
  try {
    const base = typeof window === 'undefined' ? 'http://consolev3.local' : window.location.origin;
    return new URL(url, base).pathname;
  } catch {
    return url.split('?')[0];
  }
};

export const getConsoleV3ScopeKey = (resource: string, url: string, user: string): string =>
  `${user}:${resource}:${getPathname(url)}`;

export const shouldKeepConsoleV3Alive = (
  activeScopeKey: string | undefined,
  nextScopeKey: string,
): boolean => activeScopeKey === undefined || activeScopeKey === nextScopeKey;

export interface ConsoleV3RebuildInput {
  activeScopeKey: string | undefined;
  scopeKey: string;
  resourceUrl: string;
  mountedResourceUrl: string | undefined;
  cacheExpired: boolean;
  deactivated: boolean;
  mountedRevision: string | undefined;
  revision: string;
}

/**
 * A shared Wujie app only needs rebuilding when the cached instance for the
 * same list scope is stale. Switching from one resource list to another must
 * keep the app alive so activation can deliver the new list route.
 */
export const shouldRebuildConsoleV3Instance = ({
  activeScopeKey,
  scopeKey,
  resourceUrl,
  mountedResourceUrl,
  cacheExpired,
  deactivated,
  mountedRevision,
  revision,
}: ConsoleV3RebuildInput): boolean => {
  const sameMountedScope = activeScopeKey === scopeKey && mountedResourceUrl === resourceUrl;

  return sameMountedScope && (cacheExpired || (deactivated && mountedRevision !== revision));
};

export const isConsoleV3ListCacheExpired = (
  lastUsedAt: number | undefined,
  now: number,
  ttlMs: number,
): boolean => lastUsedAt !== undefined && now - lastUsedAt > ttlMs;

export const getConsoleV3MarkName = (phase: ConsoleV3Phase, url: string): string =>
  `consolev3:${phase}:${getPathname(url)}`;

export const markConsoleV3Phase = (
  phase: ConsoleV3Phase,
  url: string,
  target: Pick<Performance, 'mark'> | undefined = typeof window === 'undefined'
    ? undefined
    : window.performance,
): string => {
  const markName = getConsoleV3MarkName(phase, url);
  target?.mark(markName);
  return markName;
};
