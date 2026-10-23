import { cloneDeep, get, set, unset } from 'lodash';

export function buildStatefulSetServicePatch(form: Record<string, any>, resourceVersion: string) {
  const result = cloneDeep(form);
  const type = get(result, 'spec.clusterIP', 'virtualIP');
  if (type === 'headlessSelector') set(result, 'spec.clusterIP', 'None');
  else unset(result, 'spec.clusterIP');
  set(result, 'metadata.resourceVersion', resourceVersion);
  return result;
}
