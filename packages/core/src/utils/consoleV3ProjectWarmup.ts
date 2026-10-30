/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { primeConsoleV3ListSeedForRoute } from './consoleV3ListSeed';
import { primeSpringCloudProbeCacheForRoute } from './springcloudProbeCache';

const PROJECT_BASE = /^(\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+)(?:\/|$)/;

export const CONSOLE_V3_LAST_PROJECT_SESSION_KEY = '__KS_LAST_V3_PROJECT_BASE_V1__';
const WARMUP_HOST_KEY = '__KS_SCHEDULE_CONSOLE_V3_PROJECT_WARMUP__';
const REMEMBER_HOST_KEY = '__KS_REMEMBER_CONSOLE_V3_PROJECT_BASE__';

export type ConsoleV3ProjectWarmupPreload = (options: {
  name: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins?: any[];
}) => void;

export interface ConsoleV3ProjectWarmupDeps {
  preloadApp?: ConsoleV3ProjectWarmupPreload;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins?: any[];
  primeListSeed?: (pathname: string) => void;
  primeProbe?: (pathname: string) => void;
  scheduleIdle?: (fn: () => void) => void;
  host?: string;
  bindHost?: Record<string, unknown>;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  document?: Pick<Document, 'addEventListener'> | null;
  locationPathname?: () => string;
}

let installed: ConsoleV3ProjectWarmupDeps | null = null;
const warmedProjects = new Set<string>();
let intentBound = false;

export function getConsoleV3ProjectBasePath(pathname: string): string | undefined {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  const matched = PROJECT_BASE.exec(path);
  return matched?.[1];
}

export function buildConsoleV3ProjectDeploymentsPath(pathname: string): string | undefined {
  const base = getConsoleV3ProjectBasePath(pathname);
  return base ? `${base}/deployments` : undefined;
}

export function isConsoleV3ProjectOverviewPath(pathname: string): boolean {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  return /\/projects\/[^/]+\/overview\/?$/.test(path);
}

function defaultScheduleIdle(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fn);
    return;
  }
  setTimeout(fn, 0);
}

function resolveStorage(
  deps: ConsoleV3ProjectWarmupDeps,
): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (deps.storage === null) return null;
  if (deps.storage) return deps.storage;
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

function currentPathname(deps: ConsoleV3ProjectWarmupDeps): string {
  if (deps.locationPathname) return deps.locationPathname();
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

/** Persist the project base so shell pages (dashboard) can warm it later. */
export function rememberConsoleV3ProjectBase(
  pathname: string,
  deps: ConsoleV3ProjectWarmupDeps = {},
): string | undefined {
  const base = getConsoleV3ProjectBasePath(pathname);
  if (!base) return undefined;
  const storage = resolveStorage({ ...installed, ...deps });
  storage?.setItem(CONSOLE_V3_LAST_PROJECT_SESSION_KEY, base);
  return base;
}

export function readLastConsoleV3ProjectBase(
  deps: ConsoleV3ProjectWarmupDeps = {},
): string | undefined {
  const storage = resolveStorage({ ...installed, ...deps });
  const value = storage?.getItem(CONSOLE_V3_LAST_PROJECT_SESSION_KEY) || '';
  return getConsoleV3ProjectBasePath(value) ? value : undefined;
}

/**
 * Warm deployments for a project path: always prime CRD/list-seed.
 * preloadApp runs only when the host is NOT currently showing an overview
 * embed (stealing `consolev3` would blank that page).
 */
export function scheduleConsoleV3ProjectListWarmup(
  pathname: string,
  deps: ConsoleV3ProjectWarmupDeps = {},
): { projectKey?: string; primed: boolean; preloadScheduled: boolean } {
  const deploymentsPath = buildConsoleV3ProjectDeploymentsPath(pathname);
  if (!deploymentsPath) {
    return { primed: false, preloadScheduled: false };
  }

  const projectKey = getConsoleV3ProjectBasePath(pathname)!;
  const merged: ConsoleV3ProjectWarmupDeps = { ...installed, ...deps };
  const primeList = merged.primeListSeed ?? primeConsoleV3ListSeedForRoute;
  const primeProbe = merged.primeProbe ?? primeSpringCloudProbeCacheForRoute;
  const scheduleIdle = merged.scheduleIdle ?? defaultScheduleIdle;
  const host = merged.host ?? (typeof window === 'undefined' ? '' : window.location.host);

  rememberConsoleV3ProjectBase(deploymentsPath, merged);
  primeProbe(deploymentsPath);
  primeList(deploymentsPath);

  const hostOnOverview = isConsoleV3ProjectOverviewPath(currentPathname(merged));
  const shouldPreload =
    !hostOnOverview && typeof merged.preloadApp === 'function' && !warmedProjects.has(projectKey);

  if (!shouldPreload) {
    return { projectKey, primed: true, preloadScheduled: false };
  }

  warmedProjects.add(projectKey);
  const preloadUrl = `//${host}/consolev3${deploymentsPath}`;
  scheduleIdle(() => {
    merged.preloadApp?.({
      name: 'consolev3',
      url: preloadUrl,
      plugins: merged.plugins,
    });
  });

  return { projectKey, primed: true, preloadScheduled: true };
}

/** After shell/dashboard preload finishes, warm the last project list ahead of navigation. */
export function warmLastConsoleV3Project(deps: ConsoleV3ProjectWarmupDeps = {}): {
  projectKey?: string;
  primed: boolean;
  preloadScheduled: boolean;
} {
  const base = readLastConsoleV3ProjectBase(deps);
  if (!base) return { primed: false, preloadScheduled: false };
  return scheduleConsoleV3ProjectListWarmup(`${base}/deployments`, deps);
}

function bindProjectLinkIntent(deps: ConsoleV3ProjectWarmupDeps): void {
  if (intentBound) return;
  const doc =
    deps.document === null
      ? null
      : (deps.document ?? (typeof document === 'undefined' ? null : document));
  if (!doc) return;
  intentBound = true;
  doc.addEventListener(
    'pointerenter',
    event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('javascript:')) return;
      let path = '';
      try {
        path = new URL(
          href,
          typeof location === 'undefined' ? 'http://local.test' : location.origin,
        ).pathname;
      } catch {
        return;
      }
      if (!getConsoleV3ProjectBasePath(path)) return;
      scheduleConsoleV3ProjectListWarmup(path);
    },
    true,
  );
}

/** Test helper: forget which projects already scheduled a list preload. */
export function resetConsoleV3ProjectWarmupState(): void {
  warmedProjects.clear();
  intentBound = false;
  installed = null;
}

export function installConsoleV3ProjectWarmup(deps: ConsoleV3ProjectWarmupDeps): void {
  installed = deps;
  const host =
    deps.bindHost ??
    (typeof window === 'undefined' ? undefined : (window as unknown as Record<string, unknown>));
  if (host) {
    host[WARMUP_HOST_KEY] = (pathname: string) => scheduleConsoleV3ProjectListWarmup(pathname);
    host[REMEMBER_HOST_KEY] = (pathname: string) => rememberConsoleV3ProjectBase(pathname);
  }
  bindProjectLinkIntent(deps);
}

export function requestConsoleV3ProjectListWarmup(
  pathname: string,
  host: Record<string, unknown> = typeof window === 'undefined'
    ? {}
    : (window as unknown as Record<string, unknown>),
): void {
  const scheduler = host[WARMUP_HOST_KEY];
  if (typeof scheduler === 'function') {
    (scheduler as (path: string) => void)(pathname);
    return;
  }
  scheduleConsoleV3ProjectListWarmup(pathname);
}
