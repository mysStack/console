import { get } from 'lodash';

import { serializeEnvFrom } from './envFrom';
import { writeReloaderPolicy } from './reloader';
import type { ConfigReferenceWorkload, EnvFromReference } from './types';

type WorkloadLike = ConfigReferenceWorkload & {
  _originData?: ConfigReferenceWorkload;
  containers?: Array<{ name?: string; envFrom?: unknown[] }>;
  annotations?: Record<string, string>;
};

export function getPodTemplateContainers(source: WorkloadLike): Array<Record<string, any>> {
  const original = source?._originData || source;
  const rawContainers = get(original, 'spec.template.spec.containers');
  if (Array.isArray(rawContainers)) {
    return rawContainers;
  }

  return Array.isArray(source?.containers) ? source.containers : [];
}

export function getContainerNames(source: WorkloadLike): string[] {
  return getPodTemplateContainers(source)
    .map(container => container?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

export function getContainerEnvFrom(source: WorkloadLike, containerName?: string): unknown[] {
  const containers = getPodTemplateContainers(source);
  const container = containerName
    ? containers.find(item => item?.name === containerName)
    : containers[0];
  const envFrom = container?.envFrom;
  return Array.isArray(envFrom) ? envFrom : [];
}

export function buildConfigReferencePatch(
  source: WorkloadLike,
  containerName: string,
  references: EnvFromReference[],
  reloaderEnabled: boolean,
) {
  const original = source?._originData || source;
  const annotations =
    get(original, 'metadata.annotations', source?.annotations || {}) ||
    ({} as Record<string, string>);
  const containers = getPodTemplateContainers(source).map(container =>
    container?.name === containerName
      ? {
          ...container,
          envFrom: serializeEnvFrom(references),
        }
      : container,
  );

  return {
    metadata: {
      annotations: writeReloaderPolicy(annotations, reloaderEnabled),
    },
    spec: {
      template: {
        spec: {
          containers,
        },
      },
    },
  };
}
