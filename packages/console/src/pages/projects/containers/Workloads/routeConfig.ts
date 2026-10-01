import type { WorkloadKind } from '../../components/WorkloadForm/types';

export const WORKLOAD_KINDS: WorkloadKind[] = ['deployments', 'statefulsets', 'daemonsets'];

/** Native create/edit routes are the default; callers can opt into the V3 rollback path. */
export const DEFAULT_NATIVE_WORKLOAD_FORM = true;

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

type WorkloadRouteParams = { workspace: string; cluster: string; namespace: string };

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function getWorkloadRouteBase(
  kind: WorkloadKind,
  { workspace, cluster, namespace }: WorkloadRouteParams,
  native: boolean,
) {
  const prefix = native ? '' : '/consolev3';
  return `${prefix}/${encodePathSegment(workspace)}/clusters/${encodePathSegment(
    cluster,
  )}/projects/${encodePathSegment(namespace)}/${kind}`;
}

export function getWorkloadCreateUrl(
  kind: WorkloadKind,
  params: WorkloadRouteParams,
  native = DEFAULT_NATIVE_WORKLOAD_FORM,
) {
  const basePath = getWorkloadRouteBase(kind, params, native);
  return native ? `${basePath}/new` : basePath;
}

export function getWorkloadEditUrl(
  kind: WorkloadKind,
  params: WorkloadRouteParams,
  name: string,
  native = DEFAULT_NATIVE_WORKLOAD_FORM,
) {
  const detailPath = `${getWorkloadRouteBase(kind, params, native)}/${encodePathSegment(name)}`;
  return native ? `${detailPath}/edit` : detailPath;
}
