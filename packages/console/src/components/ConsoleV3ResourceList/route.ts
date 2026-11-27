export interface ConsoleV3RouteWindow {
  location: { pathname: string; search: string; hash: string; href?: string };
  history: {
    state: unknown;
    replaceState: (state: unknown, title: string, url?: string | URL | null) => void;
  };
  dispatchEvent: (event: Event) => boolean;
  __KS_CONSOLE_HOST_ROUTE_SYNC__?: boolean;
}

const getRoutePath = (url: string): string => {
  const target = new URL(url, 'http://localhost');
  return `${target.pathname}${target.search}${target.hash}`;
};

const stripEmbeddedPrefix = (pathname: string): string =>
  pathname.replace(/^\/consolev3(?=\/|$)/, '') || '/';

/**
 * `/projects/:ns/deployments` is the cached workload list. A detail embed boots
 * there so Wujie keeps a live document; the host must not be yanked onto it.
 */
export function isConsoleV3CollectionPath(resourceUrl: string): boolean {
  const path = stripEmbeddedPrefix(getRoutePath(resourceUrl).split(/[?#]/)[0] || '');
  return /\/projects\/[^/]+\/[a-z0-9-]+\/?$/i.test(path);
}

export function shouldSyncAliveEmbedToUrl(hostPathname: string, resourceUrl: string): boolean {
  if (!hostPathname || !isConsoleV3CollectionPath(resourceUrl)) {
    return true;
  }
  const list =
    stripEmbeddedPrefix(getRoutePath(resourceUrl).split(/[?#]/)[0] || '').replace(/\/+$/, '') ||
    '/';
  const host = hostPathname.replace(/\/+$/, '') || '/';
  return !(host !== list && host.startsWith(`${list}/`));
}

const getCurrentPath = (appWindow: ConsoleV3RouteWindow): string =>
  `${appWindow.location.pathname}${appWindow.location.search}${appWindow.location.hash}`;

/** The child history listener must distinguish host synchronization from a user POP. */
export function notifyConsoleV3HostSync(
  appWindow: Pick<
    ConsoleV3RouteWindow,
    'history' | 'dispatchEvent' | '__KS_CONSOLE_HOST_ROUTE_SYNC__'
  >,
): void {
  const previous = appWindow.__KS_CONSOLE_HOST_ROUTE_SYNC__;
  appWindow.__KS_CONSOLE_HOST_ROUTE_SYNC__ = true;
  try {
    appWindow.dispatchEvent(
      typeof PopStateEvent === 'function'
        ? new PopStateEvent('popstate', { state: appWindow.history.state })
        : new Event('popstate'),
    );
  } finally {
    appWindow.__KS_CONSOLE_HOST_ROUTE_SYNC__ = previous;
  }
}

/**
 * Wujie does not sync the host route into an alive app when it is activated.
 * The host therefore has to put the reused V3 router back at the list route.
 */
export function syncConsoleV3ListRoute(
  appWindow: ConsoleV3RouteWindow,
  resourceUrl: string,
): boolean {
  const path = getRoutePath(resourceUrl);

  if (getCurrentPath(appWindow) === path) return false;

  appWindow.history.replaceState(appWindow.history.state, '', path);
  notifyConsoleV3HostSync(appWindow);
  return true;
}

export interface NotifyConsoleV3ActivationRouteOptions {
  /**
   * When the child location already matches, still emit `popstate` so a router
   * that missed Wujie's `replaceState` can catch up. Cold-start list embeds that
   * preloaded the same URL already rendered that route; forcing `popstate` then
   * refetches the list. Callers that only need a real navigation pass `false`.
   */
  notifyIfUnchanged?: boolean;
}

/**
 * Move a kept-alive child router onto the route of an embed that did not use
 * `alive`.
 *
 * Wujie writes that route with `history.replaceState`, which a router never
 * observes, so the location already matches when the activation finishes. The
 * router still holds the previous route and needs the notification anyway
 * unless the caller knows the child already rendered this path (preload align).
 */
export function notifyConsoleV3ActivationRoute(
  appWindow: ConsoleV3RouteWindow,
  resourceUrl: string,
  options: NotifyConsoleV3ActivationRouteOptions = {},
): boolean {
  const notifyIfUnchanged = options.notifyIfUnchanged !== false;
  const path = getRoutePath(resourceUrl);
  const moved = getCurrentPath(appWindow) !== path;

  if (moved) {
    appWindow.history.replaceState(appWindow.history.state, '', path);
  }
  if (moved || notifyIfUnchanged) {
    notifyConsoleV3HostSync(appWindow);
  }
  return moved;
}

type ConsoleV3FrameWindow = ConsoleV3RouteWindow & {
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
};

const afterActivation = (appWindow: ConsoleV3FrameWindow, sync: () => void): void => {
  const requestAnimationFrame = appWindow.requestAnimationFrame;
  if (!requestAnimationFrame) {
    setTimeout(sync, 0);
    return;
  }
  // Wujie attaches the reused shadow root before the child router's React
  // listener is restored. Two frames put the popstate after that activation.
  requestAnimationFrame(() => requestAnimationFrame(sync));
};

export function scheduleConsoleV3ListRouteSync(
  appWindow: ConsoleV3FrameWindow,
  resourceUrl: string,
  hostPathname = '',
): void {
  // syncConsoleV3ListRoute no-ops (no popstate) when already on resourceUrl,
  // which avoids a redundant list refetch after an aligned preload.
  afterActivation(appWindow, () => {
    if (
      hostPathname &&
      typeof window !== 'undefined' &&
      window.location.pathname !== hostPathname
    ) {
      return;
    }
    if (hostPathname && !shouldSyncAliveEmbedToUrl(hostPathname, resourceUrl)) {
      return;
    }
    syncConsoleV3ListRoute(appWindow, resourceUrl);
  });
}

/** Keep the explicitly requested child route and carry the host's tab/query/fragment. */
export function alignConsoleV3Url(
  resourceUrl: string,
  location: { pathname: string; search: string; hash: string },
): string {
  if (!resourceUrl.includes('/consolev3/')) return resourceUrl;
  const target = new URL(resourceUrl, 'http://localhost');
  const path = stripEmbeddedPrefix(target.pathname);
  const samePath = location.pathname === path;
  const detailTab =
    !isConsoleV3CollectionPath(resourceUrl) && location.pathname.startsWith(`${path}/`);
  if (!samePath && !detailTab) return resourceUrl;
  const pathname = detailTab ? `/consolev3${location.pathname}` : target.pathname;
  return (
    resourceUrl.slice(0, resourceUrl.indexOf('/consolev3/')) +
    pathname +
    location.search +
    location.hash
  );
}

export function scheduleConsoleV3RouteNotification(
  appWindow: ConsoleV3FrameWindow,
  resourceUrl: string,
): void {
  afterActivation(appWindow, () => notifyConsoleV3ActivationRoute(appWindow, resourceUrl));
}
