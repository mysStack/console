export type ConfigReferenceWorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

export interface ConfigReferencePathParams {
  workspace?: string;
  cluster?: string;
  namespace?: string;
  module: ConfigReferenceWorkloadModule;
  name?: string;
}

export function getConfigReferencePath({
  workspace = '',
  cluster = '',
  namespace = '',
  module,
  name = '',
}: ConfigReferencePathParams): string {
  return [
    workspace ? `/${workspace}` : '',
    `/clusters/${cluster}/projects/${namespace}/${module}/${name}/config-reference`,
  ].join('');
}
