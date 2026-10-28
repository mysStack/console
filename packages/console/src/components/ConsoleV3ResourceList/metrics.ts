import type { ConsoleV3RouteWindow } from './route';

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

export type ConsoleV3InstanceState = 'missing' | 'stale' | 'ready';

/** One `<html>` template Wujie appended to the shared ShadowRoot. */
export interface ConsoleV3TemplateElement {
  tagName?: string;
  contains(node: unknown): boolean;
  remove(): void;
}

export interface ConsoleV3ShadowRootLike {
  childElementCount: number;
  /** The canonical body Wujie moved into the newest template. */
  body?: unknown;
  children?: ArrayLike<ConsoleV3TemplateElement>;
}

export interface ConsoleV3SandboxLike {
  alive?: boolean;
  mountFlag?: boolean | null;
  /** The URL the activating embed asked for. */
  url?: string;
  iframe?: { contentWindow?: ConsoleV3RouteWindow } | null;
  shadowRoot?: ConsoleV3ShadowRootLike | null;
}

/** The child window Wujie hands to lifecycle callbacks, with its sandbox. */
export type ConsoleV3AppWindow = Window & { __WUJIE?: ConsoleV3SandboxLike };

/**
 * The shared sandbox, resolved from the DOM.
 *
 * Lifecycle callbacks hand it over while the app is activating, but a caller
 * that only learns about an activation afterwards (or never receives the
 * callback) still needs a handle on the failing sandbox.
 */
export const getConsoleV3Sandbox = (
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): ConsoleV3SandboxLike | undefined => {
  const host = doc?.querySelector('wujie-app[data-wujie-id="consolev3"]') as HTMLElement | null;
  const element = host?.shadowRoot?.firstElementChild;
  const appWindow = element?.ownerDocument?.defaultView as ConsoleV3AppWindow | null | undefined;

  return appWindow?.__WUJIE;
};

/**
 * Where the shared `consolev3` sandbox stands, read from the child window that
 * Wujie exposes on `__WUJIE`.
 *
 * - `missing`: no sandbox yet, or it was destroyed; a cold start is required.
 * - `stale`: the sandbox and its loaded scripts survive, but a non-alive embed
 *   unmounted and cleared the ShadowRoot. Activating it with `alive` would
 *   render nothing, so it must be rendered again in place.
 * - `ready`: the app still owns rendered content and an `alive` activation
 *   reuses it.
 */
export const getConsoleV3InstanceState = (
  appWindow?: ConsoleV3AppWindow,
): ConsoleV3InstanceState => {
  const sandbox = appWindow?.__WUJIE;
  const shadowRoot = sandbox?.shadowRoot;

  if (!sandbox || !shadowRoot) return 'missing';
  if (sandbox.mountFlag && shadowRoot.childElementCount > 0) return 'ready';
  return 'stale';
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
