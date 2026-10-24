import type { PathParams } from '../../types';

interface DeleteResource {
  namespace?: string;
  name?: string;
  annotations?: Record<string, string>;
}

export function buildDeleteParams(
  items: DeleteResource[],
  params: PathParams,
): Array<DeleteResource & PathParams> {
  return items.map(item => ({
    namespace: item.namespace,
    name: item.name,
    annotations: item.annotations,
    ...params,
  }));
}
