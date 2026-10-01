import { parseEnvFrom, serializeEnvFrom } from './envFrom';
import type { EnvFromReference } from './types';

export type WorkloadKind = 'deployments' | 'statefulsets' | 'daemonsets';

export interface WorkloadFormValues {
  name: string;
  image: string;
  env: Array<Record<string, unknown>>;
  envFrom: EnvFromReference[];
  serviceName?: string;
  resourceVersion?: string;
  resource?: WorkloadResource;
}

export type WorkloadResource = {
  metadata?: Record<string, any> & { name?: string; resourceVersion?: string };
  spec?: {
    [key: string]: any;
    serviceName?: string;
    template?: { spec?: { containers?: Array<Record<string, any>> } };
  };
};

export function toWorkloadForm(resource: WorkloadResource, kind: WorkloadKind): WorkloadFormValues {
  const container = resource.spec?.template?.spec?.containers?.[0] || {};
  const values: WorkloadFormValues = {
    name: resource.metadata?.name || '',
    image: container.image || '',
    env: container.env || [],
    envFrom: parseEnvFrom(container.envFrom || []),
    resourceVersion: resource.metadata?.resourceVersion,
    resource,
  };

  if (kind === 'statefulsets') {
    values.serviceName = resource.spec?.serviceName || '';
  }

  return values;
}

export function toWorkloadManifest(form: WorkloadFormValues, kind: WorkloadKind) {
  const existingSpec = form.resource?.spec || {};
  const existingTemplate = existingSpec.template || {};
  const existingPodSpec = existingTemplate.spec || {};
  const containers = existingPodSpec.containers || [];
  const existingContainer = containers[0] || {};
  const selector = existingSpec.selector || { matchLabels: { app: form.name } };
  const selectorLabels = selector.matchLabels || {};
  const templateLabels = {
    ...(existingTemplate.metadata?.labels || {}),
    ...selectorLabels,
  };
  const manifest: Record<string, any> = {
    apiVersion: 'apps/v1',
    kind:
      kind === 'statefulsets' ? 'StatefulSet' : kind === 'daemonsets' ? 'DaemonSet' : 'Deployment',
    metadata: {
      ...(form.resource?.metadata || {}),
      name: form.name,
      ...(form.resourceVersion ? { resourceVersion: form.resourceVersion } : {}),
    },
    spec: {
      ...existingSpec,
      selector,
      template: {
        ...existingTemplate,
        metadata: {
          ...(existingTemplate.metadata || {}),
          labels: templateLabels,
        },
        spec: {
          ...existingPodSpec,
          containers: [
            {
              ...existingContainer,
              name: form.name,
              image: form.image,
              env: form.env || [],
              envFrom: serializeEnvFrom(form.envFrom || []),
            },
            ...containers.slice(1),
          ],
        },
      },
    },
  };

  if (kind === 'statefulsets') {
    manifest.spec.serviceName = form.serviceName || existingSpec.serviceName || form.name;
  }

  return manifest;
}
