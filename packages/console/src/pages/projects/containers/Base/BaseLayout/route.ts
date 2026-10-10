interface ProjectRouteParts {
  host: string;
  workspace?: string;
  cluster?: string;
  namespace?: string;
}

interface EmbeddedDetailRoute {
  projectPrefix: string;
  name?: string;
}

interface EmbeddedDetailPath extends EmbeddedDetailRoute {
  hostPath: string;
  hostDetailPath: string;
}

/**
 * Build the absolute URL used by the embedded V3 application.
 *
 * The cache store is populated asynchronously by BaseLayout. A hard refresh on
 * a detail sub-route can render the Wujie host before that effect runs, so the
 * route itself must be able to provide the same prefix without producing an
 * `undefined/deployments/...` URL.
 */
export function getConsoleV3ProjectPrefix({
  host,
  workspace = '',
  cluster = '',
  namespace = '',
}: ProjectRouteParts): string {
  return `//${host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}`;
}

/**
 * Convert a route emitted by the embedded V3 app to the corresponding host route.
 * Routes for another project are ignored so a shared Wujie bus cannot navigate
 * the current host page out of its project context.
 */
export function getHostRouteFromEmbeddedRoute(route: string, projectPath: string): string | null {
  const prefix = '/consolev3';
  if (!route.startsWith(`${prefix}/`)) {
    return null;
  }

  const hostRoute = route.slice(prefix.length);
  return hostRoute.startsWith(`${projectPath}/`) ? hostRoute : null;
}

/**
 * Return the stable V3 bootstrap URL for a workload detail page.
 *
 * The cached Wujie app is mounted at the workload root first. The active
 * detail tab is applied after mount by `getConsoleV3DetailPath`, avoiding a
 * deep-link initialization race that can leave the embedded document blank.
 */
export function getConsoleV3DetailUrl({ projectPrefix, name = '' }: EmbeddedDetailRoute): string {
  return `${projectPrefix}/deployments/${name}`;
}

/**
 * Return the route that should be applied inside the already-mounted V3 app.
 *
 * Wujie preloads and caches the `consolev3` app at its dashboard URL. Passing a
 * deep detail URL to a second mount can leave the cached app with an empty
 * document, so detail tabs are switched after mount instead of changing the
 * bootstrap URL.
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
  return `${new URL(`${projectPrefix}/deployments/${name}`, 'http://localhost').pathname}${suffix}`;
}
