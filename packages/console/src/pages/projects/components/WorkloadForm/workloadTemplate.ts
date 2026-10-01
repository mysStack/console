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
}

type WorkloadResource = {
  metadata?: { name?: string; resourceVersion?: string };
  spec?: {
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
  };

  if (kind === 'statefulsets') {
    values.serviceName = resource.spec?.serviceName || '';
  }

  return values;
}

export function toWorkloadManifest(form: WorkloadFormValues, kind: WorkloadKind) {
  const manifest: Record<string, any> = {
    apiVersion: 'apps/v1',
    kind:
      kind === 'statefulsets' ? 'StatefulSet' : kind === 'daemonsets' ? 'DaemonSet' : 'Deployment',
    metadata: {
      name: form.name,
      ...(form.resourceVersion ? { resourceVersion: form.resourceVersion } : {}),
    },
    spec: {
      template: {
        metadata: { labels: { app: form.name } },
        spec: {
          containers: [
            {
              name: form.name,
              image: form.image,
              env: form.env || [],
              envFrom: serializeEnvFrom(form.envFrom || []),
            },
          ],
        },
      },
    },
  };

  if (kind === 'statefulsets' && form.serviceName) {
    manifest.spec.serviceName = form.serviceName;
  }

  return manifest;
}
