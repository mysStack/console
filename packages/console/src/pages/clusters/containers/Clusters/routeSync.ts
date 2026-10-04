const EMBEDDED_PREFIX = '/consolev3';

export function getClusterHostRoute(route: string): string | null {
  const clusterPrefix = `${EMBEDDED_PREFIX}/clusters`;
  if (!route || (route !== clusterPrefix && !route.startsWith(`${clusterPrefix}/`))) {
    return null;
  }

  return route.slice(EMBEDDED_PREFIX.length) || '/clusters';
}
