import type { WorkloadFormValues, WorkloadKind } from './types';
import { findDuplicateEnvFrom } from './envFrom';

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
  if ((values.env || []).some(row => !String(row?.name || '').trim())) {
    errors.env = '环境变量名称不能为空';
  }
  if (findDuplicateEnvFrom(values.envFrom || []).length) {
    errors.envFrom = '配置/密钥引用不能重复';
  } else if ((values.envFrom || []).some(row => !row?.type || !row.name?.trim())) {
    errors.envFrom = '配置/密钥引用必须选择资源';
  }
  return errors;
}

export function patchEnvVariable(current: Record<string, unknown>, patch: Record<string, unknown>) {
  const next = { ...current, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'value')) delete next.valueFrom;
  if (Object.prototype.hasOwnProperty.call(patch, 'valueFrom')) delete next.value;
  return next;
}

export function normalizeEnvVariable(value: Record<string, unknown>) {
  const next = { ...value };
  if (Object.prototype.hasOwnProperty.call(next, 'value')) delete next.valueFrom;
  else if (Object.prototype.hasOwnProperty.call(next, 'valueFrom')) delete next.value;
  return next;
}

export function getWorkloadFormIdentity(values: WorkloadFormValues) {
  return `${values.name}:${values.resourceVersion || ''}`;
}
