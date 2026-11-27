interface ClusterScope {
  name: string;
  isReady: boolean;
}

/** Scope the table and its links to a confirmed, ready cluster. */
export function resolveProjectCluster(
  selected: string,
  clusters: ClusterScope[] | undefined,
  loading: boolean,
): string {
  if (loading || !Array.isArray(clusters)) return '';
  const ready = clusters.filter(cluster => cluster.name && cluster.isReady);
  return ready.find(cluster => cluster.name === selected)?.name || ready[0]?.name || '';
}

export function getScopedProjectPath(
  workspace: string | undefined,
  cluster: string | undefined,
  namespace: string | undefined,
): string {
  return workspace && cluster && namespace
    ? `/${workspace}/clusters/${cluster}/projects/${namespace}`
    : '';
}
