interface ProjectRouteParts {
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

/**
 * Preserve the host detail sub-route in the relative V3 bootstrap URL.
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
