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
