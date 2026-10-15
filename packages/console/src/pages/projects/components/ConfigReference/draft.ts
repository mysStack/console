import { cloneDeep, get, set, unset } from 'lodash';
/* eslint-disable @typescript-eslint/no-use-before-define */

import type { EnvFromReference } from './types';
import type { FileMountReference } from './fileMount';
import { buildConfigReferencePatch } from './workload';
import { readReloaderPolicy } from './reloader';

export interface ConfigReferenceDraftChange {
  containerName: string;
  references: EnvFromReference[];
  reloaderEnabled?: boolean;
  fileMounts?: FileMountReference[];
}

export function createConfigReferenceDraftSession(source: Record<string, any>) {
  const original = cloneDeep(source);
  let changes: ConfigReferenceDraftChange[] = [];
  let submittedChanges: ConfigReferenceDraftChange[] = [];
  let activeName: string | undefined;
  let beforeContainer: ConfigReferenceDraftChange[] | undefined;
  const cancelContainer = () => {
    if (beforeContainer) changes = beforeContainer;
    activeName = undefined;
    beforeContainer = undefined;
  };
  return {
    beginContainer: (name: string) => {
      if (name === activeName) return;
      cancelContainer();
      activeName = name;
      beforeContainer = cloneDeep(changes);
      if (
        !get(original, 'spec.template.spec.containers', []).some(
          (item: any) => item.name === name,
        ) &&
        !changes.some(item => item.containerName === name)
      ) {
        // V3 may clone another container to seed its form. envFrom must not
        // follow that clone: a new container starts with no whole-source refs.
        changes.push({
          containerName: name,
          references: [],
        });
      }
    },
    stage: (change: ConfigReferenceDraftChange) => {
      if (!change.containerName || change.containerName !== activeName) {
        throw new Error('The configuration draft does not match the active container');
      }
      const previous = changes.find(item => item.containerName === activeName);
      changes = [
        ...changes.filter(item => item.containerName !== activeName),
        cloneDeep({ ...previous, ...change }),
      ];
    },
    confirmContainer: () => {
      activeName = undefined;
      beforeContainer = undefined;
    },
    cancelContainer,
    confirmGroup: () => {
      submittedChanges = cloneDeep(changes);
    },
    cancelGroup: () => {
      cancelContainer();
      changes = cloneDeep(submittedChanges);
    },
    getSubmittedChanges: () => cloneDeep(submittedChanges),
    getChanges: () => cloneDeep(changes),
    getSource: (name: string): Record<string, any> => {
      const template = cloneDeep(original);
      const containers = get(template, 'spec.template.spec.containers');
      if (name && !containers.some((item: any) => item.name === name)) {
        containers.push({ name });
      }
      return mergeConfigReferenceDrafts(template, changes);
    },
  };
}

export function mergeConfigReferenceDrafts<T extends Record<string, any>>(
  template: T,
  changes: ConfigReferenceDraftChange[],
): T {
  const result = cloneDeep(template);
  const containers = get(result, 'spec.template.spec.containers');
  if (!Array.isArray(containers)) {
    throw new Error('The native workload submission has no container list');
  }
  for (const change of changes) {
    // A container removed in the native editor must stay removed. Never borrow
    // the first container or recreate the stale draft's target.
    if (
      !change.containerName ||
      !containers.some((item: Record<string, any>) => item.name === change.containerName)
    ) {
      continue;
    }
    const patch = buildConfigReferencePatch(
      result as any,
      change.containerName,
      change.references,
      change.reloaderEnabled ?? readReloaderPolicy(result.metadata?.annotations || {}).enabled,
      change.fileMounts,
    );
    // Reuse the same feature-owned paths as independent editing, but apply them
    // to the complete native submission instead of sending an early API PATCH.
    for (const operation of patch) {
      const path = operation.path
        .slice(1)
        .split('/')
        .map((part: string) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (operation.op === 'remove') {
        unset(result, path);
      } else {
        set(result, path, cloneDeep(operation.value));
      }
    }
  }
  return result;
}
