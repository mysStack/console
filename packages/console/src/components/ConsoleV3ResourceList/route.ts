export interface ConsoleV3RouteWindow {
  location: { pathname: string; search: string; hash: string; href?: string };
  history: {
    state: unknown;
    replaceState: (state: unknown, title: string, url?: string | URL | null) => void;
  };
  dispatchEvent: (event: Event) => boolean;
}

/**
 * Wujie does not sync the host route into an alive app when it is activated.
 * The host therefore has to put the reused V3 router back at the list route.
 */
export function syncConsoleV3ListRoute(
  appWindow: ConsoleV3RouteWindow,
  resourceUrl: string,
): boolean {
  const target = new URL(resourceUrl, 'http://localhost');
  const path = `${target.pathname}${target.search}${target.hash}`;
  const currentPath = `${appWindow.location.pathname}${appWindow.location.search}${appWindow.location.hash}`;

  if (currentPath === path) return false;

  appWindow.history.replaceState(appWindow.history.state, '', path);
  const event =
    typeof PopStateEvent === 'function'
      ? new PopStateEvent('popstate', { state: appWindow.history.state })
      : new Event('popstate');
  appWindow.dispatchEvent(event);
  return true;
}
