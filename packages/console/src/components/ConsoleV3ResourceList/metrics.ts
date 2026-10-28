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

/**
 * A writer race can hand the list the bare project path, without the
 * `/consolev3/` marker. Wujie then resolves it against the host origin and
 * mounts nothing, leaving the list blank for good. Restore the absolute URL.
 */
export const normalizeConsoleV3Url = (url: string, host: string): string => {
  if (url.includes('/consolev3/')) return url;
  if (url.startsWith('/')) return `//${host}/consolev3${url}`;
  return url;
};

export const shouldKeepConsoleV3Alive = (
  activeScopeKey: string | undefined,
  nextScopeKey: string,
): boolean => activeScopeKey === undefined || activeScopeKey === nextScopeKey;

/**
 * Whether the shared `consolev3` app still has rendered content.
 *
 * Wujie clears the host ShadowRoot when another caller unmounts the app, and a
 * caller that does not use `alive` leaves nothing behind. Reusing such an
 * instance renders a blank page, so the mount must be verified against the
 * real DOM instead of trusting module bookkeeping.
 */
export const isConsoleV3InstanceMounted = (
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): boolean => {
  const host = doc?.querySelector('wujie-app[data-wujie-id="consolev3"]');
  const shadowRoot = (host as HTMLElement | null)?.shadowRoot;

  return Boolean(shadowRoot && shadowRoot.childElementCount > 0);
};

export interface ConsoleV3RebuildInput {
  cacheExpired: boolean;
  deactivated: boolean;
  mountedRevision: string | undefined;
  revision: string;
}

/**
 * Reuse the live instance across resource scopes: the app is alive, and the
 * activated lifecycle syncs it to the new list route. Rebuild only when the
 * cache expired or a mutation changed the list the user is returning to.
 */
export const shouldRebuildConsoleV3Instance = ({
  cacheExpired,
  deactivated,
  mountedRevision,
  revision,
}: ConsoleV3RebuildInput): boolean => cacheExpired || (deactivated && mountedRevision !== revision);

/**
 * How long to wait before checking that a reused instance actually rendered.
 *
 * A destroyed app re-mounts with an empty ShadowRoot and only the rebuild
 * repairs it. Waiting the full cold-start delay leaves the list blank for
 * seconds after a cluster, workspace or platform embed destroyed the shared
 * app. Once any `consolev3` mount has rendered, an empty ShadowRoot that late
 * is a destroyed instance rather than a slow boot, so the check can run
 * earlier; the cold path keeps the long delay.
 */
export const CONSOLE_V3_REUSED_VERIFY_DELAY_MS = 1_000;

export const getConsoleV3VerifyDelayMs = (hasRendered: boolean, coldDelayMs: number): number =>
  hasRendered ? Math.min(CONSOLE_V3_REUSED_VERIFY_DELAY_MS, coldDelayMs) : coldDelayMs;

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
