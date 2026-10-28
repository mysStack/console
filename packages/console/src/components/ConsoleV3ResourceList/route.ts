export interface ConsoleV3RouteWindow {
  location: { pathname: string; search: string; hash: string; href?: string };
  history: {
    state: unknown;
    replaceState: (state: unknown, title: string, url?: string | URL | null) => void;
  };
  dispatchEvent: (event: Event) => boolean;
}

const getRoutePath = (url: string): string => {
  const target = new URL(url, 'http://localhost');
  return `${target.pathname}${target.search}${target.hash}`;
};

const getCurrentPath = (appWindow: ConsoleV3RouteWindow): string =>
  `${appWindow.location.pathname}${appWindow.location.search}${appWindow.location.hash}`;

const createPopStateEvent = (appWindow: ConsoleV3RouteWindow): Event =>
  typeof PopStateEvent === 'function'
    ? new PopStateEvent('popstate', { state: appWindow.history.state })
    : new Event('popstate');

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
  appWindow.dispatchEvent(createPopStateEvent(appWindow));
  return true;
}

/**
 * Move a kept-alive child router onto the route of an embed that did not use
 * `alive`.
 *
 * Wujie writes that route with `history.replaceState`, which a router never
 * observes, so the location already matches when the activation finishes. The
 * router still holds the previous route and needs the notification anyway.
 */
export function notifyConsoleV3ActivationRoute(
  appWindow: ConsoleV3RouteWindow,
  resourceUrl: string,
): boolean {
  const path = getRoutePath(resourceUrl);
  const moved = getCurrentPath(appWindow) !== path;

  if (moved) {
    appWindow.history.replaceState(appWindow.history.state, '', path);
  }
  appWindow.dispatchEvent(createPopStateEvent(appWindow));
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
): void {
  afterActivation(appWindow, () => syncConsoleV3ListRoute(appWindow, resourceUrl));
}

export function scheduleConsoleV3RouteNotification(
  appWindow: ConsoleV3FrameWindow,
  resourceUrl: string,
): void {
  afterActivation(appWindow, () => notifyConsoleV3ActivationRoute(appWindow, resourceUrl));
}
