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
