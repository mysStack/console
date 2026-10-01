import type { WorkloadFormValues, WorkloadKind } from './types';

export function createEmptyWorkloadForm(kind: WorkloadKind): WorkloadFormValues {
  const values: WorkloadFormValues = {
    name: '',
    image: '',
    env: [],
    envFrom: [],
    resource: undefined,
  };
  if (kind === 'statefulsets') values.serviceName = '';
  return values;
}

export function validateWorkloadForm(values: WorkloadFormValues) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = '名称不能为空';
  if (!values.image.trim()) errors.image = '镜像不能为空';
  return errors;
}
