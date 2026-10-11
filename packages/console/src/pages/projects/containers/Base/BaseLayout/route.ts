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

export function getConsoleV3DetailUrl({
  host,
  projectPrefix,
  name = '',
}: EmbeddedDetailRoute): string {
  return `//${host}/consolev3${projectPrefix}/deployments/${name}`;
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

/** Follow host back/forward navigation without creating another history entry. */
export function syncConsoleV3DetailRoute(appWindow: Window, embeddedPath: string): boolean {
  if (
    appWindow.location.pathname === embeddedPath ||
    !appWindow.document.getElementById('root')?.hasChildNodes()
  ) {
    return false;
  }
  appWindow.history.replaceState(appWindow.history.state, '', embeddedPath);
  appWindow.dispatchEvent(new PopStateEvent('popstate'));
  return true;
}

/** Cached V3 may mount asynchronously. Retry briefly and cancel stale targets. */
export function scheduleConsoleV3DetailRoute(appWindow: Window, embeddedPath: string): () => void {
  let cancelled = false;
  let frame: number | undefined;
  let framesRemaining = 300;
  const sync = () => {
    frame = undefined;
    if (cancelled || appWindow.location.pathname === embeddedPath) return;
    if (!appWindow.document.getElementById('root')?.hasChildNodes()) {
      if (framesRemaining > 0) {
        framesRemaining -= 1;
        frame = appWindow.requestAnimationFrame(sync);
      }
      return;
    }
    syncConsoleV3DetailRoute(appWindow, embeddedPath);
  };
  sync();
  return () => {
    cancelled = true;
    if (frame !== undefined) appWindow.cancelAnimationFrame(frame);
  };
}
