import { get } from 'lodash';

import { serializeEnvFrom } from './envFrom';
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
  const containers = getPodTemplateContainers(source);
  const containerIndex = containers.findIndex(container => container?.name === containerName);
  if (containerIndex < 0) {
    return [];
  }

  const currentEnvFrom = containers[containerIndex]?.envFrom;
  const nextEnvFrom = serializeEnvFrom(references);
  const patch: Array<Record<string, any>> = [];
  const envFromPath = `/spec/template/spec/containers/${containerIndex}/envFrom`;

  if (nextEnvFrom.length > 0) {
    patch.push({
      op: Array.isArray(currentEnvFrom) ? 'replace' : 'add',
      path: envFromPath,
      value: nextEnvFrom,
    });
  } else if (Array.isArray(currentEnvFrom)) {
    patch.push({ op: 'remove', path: envFromPath });
  }

  const reloaderPath = '/metadata/annotations/reloader.stakater.com~1auto';
  const hadAnnotations = Object.keys(annotations).length > 0;
  const hadReloaderAnnotation = annotations['reloader.stakater.com/auto'] !== undefined;

  if (reloaderEnabled) {
    patch.push({
      op: hadReloaderAnnotation ? 'replace' : 'add',
      path: hadAnnotations ? reloaderPath : '/metadata/annotations',
      value: hadAnnotations ? 'true' : { 'reloader.stakater.com/auto': 'true' },
    });
  } else if (hadReloaderAnnotation) {
    patch.push({ op: 'remove', path: reloaderPath });
  }

  return patch;
}
