/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { primeConsoleV3ListSeedForRoute } from './consoleV3ListSeed';
import { primeSpringCloudProbeCacheForRoute } from './springcloudProbeCache';

const PROJECT_BASE = /^(\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+)(?:\/|$)/;

const WARMUP_HOST_KEY = '__KS_SCHEDULE_CONSOLE_V3_PROJECT_WARMUP__';

export type ConsoleV3ProjectWarmupPreload = (options: {
  name: string;
  url: string;
  plugins?: unknown[];
}) => void;

export interface ConsoleV3ProjectWarmupDeps {
  preloadApp?: ConsoleV3ProjectWarmupPreload;
  plugins?: unknown[];
  primeListSeed?: (pathname: string) => void;
  primeProbe?: (pathname: string) => void;
  scheduleIdle?: (fn: () => void) => void;
  host?: string;
  /** Host `window` (or test double) that receives the scheduler global. */
  bindHost?: Record<string, unknown>;
}

let installed: ConsoleV3ProjectWarmupDeps | null = null;
const warmedProjects = new Set<string>();

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

/**
 * When the host enters a project, start CRD/list-seed for deployments and
 * (when the shared sandbox is not showing overview) preload that list URL.
 * Overview keeps `consolev3` on the overview route; stealing it would blank
 * the page. Direct SPA jumps onto a list still benefit from early primes.
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

  primeProbe(deploymentsPath);
  primeList(deploymentsPath);

  const onOverview = isConsoleV3ProjectOverviewPath(pathname);
  // List landings already resolve preload to the list URL in initWujie; still
  // allow a follow-up preload when the session started on dashboard.
  const shouldPreload =
    !onOverview && typeof merged.preloadApp === 'function' && !warmedProjects.has(projectKey);

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

/** Test helper: forget which projects already scheduled a list preload. */
export function resetConsoleV3ProjectWarmupState(): void {
  warmedProjects.clear();
}

export function installConsoleV3ProjectWarmup(deps: ConsoleV3ProjectWarmupDeps): void {
  installed = deps;
  const host =
    deps.bindHost ??
    (typeof window === 'undefined' ? undefined : (window as unknown as Record<string, unknown>));
  if (host) {
    host[WARMUP_HOST_KEY] = (pathname: string) => scheduleConsoleV3ProjectListWarmup(pathname);
  }
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
