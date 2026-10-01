import type { WorkloadKind } from '../../components/WorkloadForm/types';

export const WORKLOAD_KINDS: WorkloadKind[] = ['deployments', 'statefulsets', 'daemonsets'];

export const WORKLOAD_ROUTE_PATHS = WORKLOAD_KINDS.flatMap(kind => [
  `${kind}/new`,
  `${kind}/:name/edit`,
]);

export function getWorkloadKind(value?: string): WorkloadKind | undefined {
  return WORKLOAD_KINDS.includes(value as WorkloadKind) ? (value as WorkloadKind) : undefined;
}

export function getWorkloadTitle(kind: WorkloadKind, mode: 'create' | 'edit') {
  const label =
    kind === 'statefulsets' ? 'StatefulSet' : kind === 'daemonsets' ? 'DaemonSet' : 'Deployment';
  return `${mode === 'create' ? '创建' : '编辑'} ${label}`;
}

export function getWorkloadPath(
  params: { workspace: string; cluster: string; namespace: string },
  kind: WorkloadKind,
  name?: string,
) {
  const { workspace, cluster, namespace } = params;
  const listPath = `/${workspace}/clusters/${cluster}/projects/${namespace}/${kind}`;
  return name ? `${listPath}/${name}` : listPath;
}
