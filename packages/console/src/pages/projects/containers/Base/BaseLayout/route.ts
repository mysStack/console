interface ProjectRouteParts {
  host: string;
  workspace?: string;
  cluster?: string;
  namespace?: string;
}

interface EmbeddedDetailRoute {
  projectPrefix: string;
  name?: string;
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
 * Keep a directly opened host sub-route (for example `/env`) when creating the
 * initial Wujie URL. Without this, a browser refresh always booted V3 at the
 * default resource-status tab while the host URL pointed at another tab.
 */
export function getConsoleV3DetailUrl({
  projectPrefix,
  name = '',
  hostPath,
  hostDetailPath,
}: EmbeddedDetailRoute): string {
  const suffix = hostPath.startsWith(`${hostDetailPath}/`)
    ? hostPath.slice(hostDetailPath.length)
    : '';
  return `${projectPrefix}/deployments/${name}${suffix}`;
}
