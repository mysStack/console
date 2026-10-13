interface ProjectRouteParts {
  workspace?: string;
  cluster?: string;
  namespace?: string;
}

interface EmbeddedDetailRoute {
  host: string;
  projectPrefix: string;
  name?: string;
}

interface EmbeddedDetailPath extends Omit<EmbeddedDetailRoute, 'host'> {
  hostPath: string;
  hostDetailPath: string;
}

/**
 * Build the project-relative URL consumed by the preloaded V3 Wujie app.
 *
 * Wujie is registered at `/consolev3/` and resolves this route against that
 * base. Passing an absolute `/consolev3/...` URL here bypasses the preloaded
 * app's normal activation path and can leave its root document empty.
 */
export function getConsoleV3ProjectPrefix({
  workspace = '',
  cluster = '',
  namespace = '',
}: ProjectRouteParts): string {
  return `/${workspace}/clusters/${cluster}/projects/${namespace}`;
}

export function getConsoleV3DetailUrl({ host, projectPrefix }: EmbeddedDetailRoute): string {
  return `//${host}/consolev3${projectPrefix}/deployments`;
}

export function getConsoleV3DeploymentListPath(projectPrefix: string): string {
  return `/consolev3${projectPrefix}/deployments`;
}

export function shouldSyncConsoleV3DetailRoute(
  appPath: string,
  embeddedPath: string,
  listPath: string,
): boolean {
  return appPath === listPath && appPath !== embeddedPath;
}

/**
 * Convert a directly opened host tab into the browser path used by the mounted
 * V3 application. The app must first boot at the stable workload root above;
 * starting the cached Wujie app at a deep link leaves its document empty.
 */
export function getConsoleV3DetailPath({
  projectPrefix,
  name = '',
  hostPath,
  hostDetailPath,
}: EmbeddedDetailPath): string {
  const suffix = hostPath.startsWith(`${hostDetailPath}/`)
    ? hostPath.slice(hostDetailPath.length)
    : '';
  return `/consolev3${projectPrefix}/deployments/${name}${suffix}`;
}

export function bindConsoleV3DetailHistory(
  hostWindow: Window,
  appWindow: Window,
  route: Omit<EmbeddedDetailPath, 'hostPath'>,
): () => void {
  const followHistory = () => {
    const hostPath = hostWindow.location.pathname;
    if (hostPath !== route.hostDetailPath && !hostPath.startsWith(`${route.hostDetailPath}/`)) {
      return;
    }
    const path = getConsoleV3DetailPath({ ...route, hostPath });
    if (appWindow.location.pathname === path) return;
    // Native browser Back emits on the host only (Wujie sync=false). Keep
    // both history entries intact; notify V3's router in its own document.
    appWindow.history.replaceState(appWindow.history.state, '', path);
    // The Wujie app window may be a proxy without event constructors.
    const event = new PopStateEvent('popstate', {
      state: appWindow.history.state,
    });
    appWindow.dispatchEvent(event);
  };
  hostWindow.addEventListener('popstate', followHistory);
  return () => hostWindow.removeEventListener('popstate', followHistory);
}
