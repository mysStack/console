import { get } from 'lodash';

import type { ConfigReferenceKind } from './types';

/**
 * A file mount as the user expresses it: still container-scoped, like `envFrom`.
 *
 * Kubernetes stores it in two layers though — the volume lives at Pod level
 * (`spec.template.spec.volumes`) and the mount at container level
 * (`spec.template.spec.containers[i].volumeMounts`) — so this module owns the
 * mapping between the two. See docs/designs/2026-10-07-config-reference-file-mount-design.md.
 */
export interface FileMountReference {
  kind: ConfigReferenceKind;
  name: string;
  mountPath: string;
  readOnly: boolean;
}

export interface FileMountProblem {
  index: number;
  /** A stable code; the caller turns it into a localized message. */
  code: 'PATH_ABSOLUTE' | 'PATH_DUPLICATE' | 'RESOURCE_DUPLICATE' | 'NAME_REQUIRED';
}

type WorkloadLike = {
  _originData?: any;
  [key: string]: any;
};

const VOLUME_NAME_MAX_LENGTH = 63;
/** Volume names must be a DNS-1123 label: no dots, no underscores, no uppercase. */
const DNS_1123_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const ABSOLUTE_PATH = /^\//;

/** Derive a valid, unused volume name from a resource name. */
export function toVolumeName(resourceName: string, taken: readonly string[] = []): string {
  const base =
    String(resourceName || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^[^a-z0-9]+/, '')
      .replace(/[^a-z0-9]+$/, '')
      .slice(0, VOLUME_NAME_MAX_LENGTH) || 'config';

  if (!taken.includes(base)) {
    return base;
  }
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, VOLUME_NAME_MAX_LENGTH - tail.length)}${tail}`;
    if (!taken.includes(candidate)) {
      return candidate;
    }
  }
  return base;
}

export function isVolumeName(name: string): boolean {
  return DNS_1123_LABEL.test(String(name || '')) && String(name).length <= VOLUME_NAME_MAX_LENGTH;
}

export function getWorkloadVolumes(source: WorkloadLike): Array<Record<string, any>> {
  const original = source?._originData || source;
  const volumes = get(original, 'spec.template.spec.volumes');
  return Array.isArray(volumes) ? volumes : [];
}

export function getContainerVolumeMounts(
  source: WorkloadLike,
  containerName?: string,
): Array<Record<string, any>> {
  const original = source?._originData || source;
  const containers = get(original, 'spec.template.spec.containers');
  const list = Array.isArray(containers) ? containers : [];
  const container = containerName
    ? list.find((item: any) => item?.name === containerName)
    : list[0];
  return Array.isArray(container?.volumeMounts) ? container.volumeMounts : [];
}

/** Does this volume already point at the given ConfigMap/Secret? */
export function volumeReferences(volume: any, kind: ConfigReferenceKind, name: string): boolean {
  const source = kind === 'configMap' ? volume?.configMap : volume?.secret;
  return !!source && source.name === name && !volume?.projected && !volume?.emptyDir;
}

/**
 * Map container-scoped file mounts onto the two Kubernetes layers.
 *
 * A volume belongs to the Pod, so a resource another container already mounts is
 * reused instead of duplicated, and a volume is only dropped once nothing mounts it
 * any more. Volumes this container never referenced are left untouched, so a save
 * never rewrites state the user did not edit.
 */
export function planFileMounts({
  volumes,
  containerMounts,
  otherContainerMounts,
  references,
}: {
  volumes: Array<Record<string, any>>;
  containerMounts: Array<Record<string, any>>;
  otherContainerMounts: Array<Record<string, any>>;
  references: FileMountReference[];
}): { volumes: Array<Record<string, any>>; volumeMounts: Array<Record<string, any>> } {
  const nextVolumes = volumes.map(volume => ({ ...volume }));
  const taken = nextVolumes.map(volume => volume?.name).filter(Boolean);

  const volumeMounts = references.map(reference => {
    let volume = nextVolumes.find(item => volumeReferences(item, reference.kind, reference.name));
    if (!volume) {
      const name = toVolumeName(reference.name, taken);
      taken.push(name);
      volume = { name, [reference.kind]: { name: reference.name } };
      nextVolumes.push(volume);
    }
    // `readOnly` is left out when false: that is Kubernetes' own default, and
    // emitting it would make otherwise-identical mounts differ.
    return reference.readOnly
      ? { name: volume.name, mountPath: reference.mountPath, readOnly: true }
      : { name: volume.name, mountPath: reference.mountPath };
  });

  const orphaned = containerMounts
    .map(mount => mount?.name)
    .filter((name): name is string => !!name && !volumeMounts.some(mount => mount.name === name));

  const resultVolumes = nextVolumes.filter(volume => {
    if (!orphaned.includes(volume?.name)) {
      return true;
    }
    return otherContainerMounts.some(mount => mount?.name === volume?.name);
  });

  return { volumes: resultVolumes, volumeMounts };
}

export function validateFileMounts(references: FileMountReference[]): FileMountProblem[] {
  const problems: FileMountProblem[] = [];
  const paths = new Set<string>();
  const resources = new Set<string>();

  references.forEach((reference, index) => {
    if (!reference.name) {
      problems.push({ index, code: 'NAME_REQUIRED' });
    }
    if (!ABSOLUTE_PATH.test(reference.mountPath || '')) {
      problems.push({ index, code: 'PATH_ABSOLUTE' });
    } else if (paths.has(reference.mountPath)) {
      problems.push({ index, code: 'PATH_DUPLICATE' });
    }
    paths.add(reference.mountPath);

    const key = `${reference.kind}:${reference.name}`;
    if (reference.name && resources.has(key)) {
      problems.push({ index, code: 'RESOURCE_DUPLICATE' });
    }
    resources.add(key);
  });

  return problems;
}

/**
 * The JSON Patch operations for the two layers, emitted only when they change so a
 * save that only touched `envFrom` never rewrites the volumes.
 */
export function buildFileMountPatch(
  source: WorkloadLike,
  containerIndex: number,
  containerName: string,
  references: FileMountReference[],
): Array<Record<string, any>> {
  const original = source?._originData || source;
  const containers = get(original, 'spec.template.spec.containers');
  const list = Array.isArray(containers) ? containers : [];
  const volumes = getWorkloadVolumes(source);
  const containerMounts = getContainerVolumeMounts(source, containerName);
  const otherContainerMounts = list
    .filter((_item: any, index: number) => index !== containerIndex)
    .flatMap((item: any) => (Array.isArray(item?.volumeMounts) ? item.volumeMounts : []));

  const planned = planFileMounts({
    volumes,
    containerMounts,
    otherContainerMounts,
    references,
  });

  const patch: Array<Record<string, any>> = [];
  const volumesPath = '/spec/template/spec/volumes';
  const mountsPath = `/spec/template/spec/containers/${containerIndex}/volumeMounts`;

  // Compare only the fields this feature owns. Kubernetes adds defaults of its own —
  // it puts `defaultMode: 420` on a configMap volume — and a plain deep comparison
  // treated that as a change on every save: a redundant `replace` that also dropped
  // the field the API had added. (Found by verifying Reloader against a volume mount.)
  const projectVolume = (volume: any) => ({
    name: volume?.name,
    configMap: volume?.configMap?.name,
    secret: volume?.secret?.name,
  });
  const projectMount = (mount: any) => ({
    name: mount?.name,
    mountPath: mount?.mountPath,
    readOnly: !!mount?.readOnly,
  });
  const same = (current: any[], next: any[], project: (item: any) => unknown) =>
    JSON.stringify((current || []).map(project)) === JSON.stringify((next || []).map(project));

  if (!same(volumes, planned.volumes, projectVolume)) {
    if (planned.volumes.length === 0) {
      patch.push({ op: 'remove', path: volumesPath });
    } else {
      patch.push({
        op: volumes.length > 0 ? 'replace' : 'add',
        path: volumesPath,
        value: planned.volumes,
      });
    }
  }

  if (!same(containerMounts, planned.volumeMounts, projectMount)) {
    if (planned.volumeMounts.length === 0) {
      patch.push({ op: 'remove', path: mountsPath });
    } else {
      patch.push({
        op: containerMounts.length > 0 ? 'replace' : 'add',
        path: mountsPath,
        value: planned.volumeMounts,
      });
    }
  }

  return patch;
}
