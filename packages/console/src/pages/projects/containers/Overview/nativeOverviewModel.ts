export const NATIVE_OVERVIEW_TEST_KEY = 'ks-console-native-overview-test';

export function getNativeOverviewMode(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(NATIVE_OVERVIEW_TEST_KEY) === '1';
  } catch {
    return false;
  }
}

export interface ProjectScope {
  workspace: string;
  cluster: string;
  namespace: string;
}

export function getProjectResourceHref(
  scope: ProjectScope,
  resource: string,
  status?: string,
): string {
  const { workspace, cluster, namespace } = scope;
  if (!workspace || !cluster || !namespace || !resource) return '';
  return `/${workspace}/clusters/${cluster}/projects/${namespace}/${resource}${status ? '?status=' + encodeURIComponent(status) : ''}`;
}

export function getScopedWorkloadRank(
  response: any,
  metricName: string,
  scope: Pick<ProjectScope, 'namespace' | 'cluster'>,
): { name: string; kind: string; value: number }[] {
  const result = response?.results?.find((item: any) => item.metric_name === metricName)?.data
    ?.result;
  if (!Array.isArray(result)) return [];
  return result
    .flatMap((item: any) => {
      const metric = item?.metric;
      if (
        !metric ||
        metric.namespace !== scope.namespace ||
        (metric.cluster && metric.cluster !== scope.cluster)
      )
        return [];
      const name = String(metric.workload || '').replace(/^\w+:/, '');
      const value = Number(item?.value?.[1]);
      if (!name || !Number.isFinite(value) || value < 0) return [];
      return [{ name, kind: String(metric.owner_kind || ''), value }];
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}
