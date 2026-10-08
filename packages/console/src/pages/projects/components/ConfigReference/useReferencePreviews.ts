import { useEffect, useMemo, useRef, useState } from 'react';
import { configMapStore, request, secretStore } from '@ks-console/shared';

import { PREVIEW_SECRET_KEYS, previewReferences } from './preview';
import type { ConfigReferenceKind, EnvFromReference } from './types';
import type { KeysLookup, ReferencePreview, ResourceKeys } from './preview';

/** Identity of a reference row's resource, ignoring the prefix. */
export const referenceKey = (reference: EnvFromReference) => `${reference.kind}:${reference.name}`;

/**
 * Loads the key names of every referenced ConfigMap/Secret and turns them into a
 * per-row preview of what the reference will actually create.
 *
 * Shared by the editor panel and the read-only summary so the two cannot drift
 * apart. Keys are read one resource at a time — a namespace-wide list would also
 * work, but it would transfer every ConfigMap and Secret in the project.
 */
export function useReferencePreviews(
  references: EnvFromReference[],
  cluster: string,
  namespace: string,
  options: { manualEnvNames?: string[] } = {},
): ReferencePreview[] {
  const { manualEnvNames } = options;

  const targets = useMemo(() => {
    const unique = new Map<string, { kind: ConfigReferenceKind; name: string }>();
    references.forEach(reference => {
      if (reference.name) {
        unique.set(referenceKey(reference), { kind: reference.kind, name: reference.name });
      }
    });
    return Array.from(unique.entries()).map(([token, item]) => ({ token, ...item }));
  }, [references]);

  const [resourceKeys, setResourceKeys] = useState<Record<string, ResourceKeys>>({});
  // Mirror so the fetch effect below does not have to depend on the state it
  // writes. With resourceKeys in its dependencies, every successful fetch re-ran
  // the effect and retried the resource that had just failed, once per sibling.
  const resourceKeysRef = useRef(resourceKeys);
  useEffect(() => {
    resourceKeysRef.current = resourceKeys;
  }, [resourceKeys]);

  useEffect(() => {
    if (!targets.length) {
      return undefined;
    }
    let active = true;
    const have = resourceKeysRef.current;
    const missing = targets.filter(target => !(target.name in (have[target.kind] || {})));
    if (!missing.length) {
      return undefined;
    }

    Promise.all(
      missing.map(async target => {
        if (target.kind === 'secret' && !PREVIEW_SECRET_KEYS) {
          return null;
        }
        try {
          if (target.kind === 'secret') {
            // Raw request on purpose: the shared Secret mapper runs safeAtob over
            // every value and only the key names are needed. Values still transit
            // the wire — Kubernetes has no keys-only API — but they are never
            // decoded, stored or rendered.
            const url = secretStore.getDetailUrl({
              cluster,
              namespace,
              name: target.name,
            });
            const raw: any = await request.get(url);
            // Names only: the value is never decoded, so none is carried here.
            // Anything else would be a promise this code cannot keep.
            return {
              token: target.token,
              keys: {
                data: Object.keys(raw?.data || {}).map(key => ({ key })),
                binaryData: [],
              } as ResourceKeys,
            };
          }

          const detail: any = await configMapStore.fetchDetail({
            cluster,
            namespace,
            name: target.name,
          });
          return {
            token: target.token,
            keys: {
              data: Object.entries(detail?.data || {}).map(([key, value]) => ({
                key,
                value: String(value),
              })),
              binaryData: Object.keys(detail?.binaryData || {}),
            } as ResourceKeys,
          };
        } catch {
          return null;
        }
      }),
    ).then(results => {
      if (!active) {
        return;
      }
      const fresh: Record<string, ResourceKeys> = {};
      results.forEach(item => {
        if (item) fresh[item.token] = item.keys;
      });
      if (Object.keys(fresh).length) {
        setResourceKeys(previous => ({ ...previous, ...fresh }));
      }
    });

    return () => {
      active = false;
    };
  }, [targets, cluster, namespace]);

  return useMemo(
    // A key that is still loading — or whose fetch failed — resolves to undefined,
    // which the preview reports as `resolved: false`. That is deliberately not the
    // same as an empty resource, which really does contribute nothing.
    () =>
      previewReferences(
        references,
        (reference => resourceKeys[referenceKey(reference)]) as KeysLookup,
        {
          manualEnvNames,
        },
      ),
    [references, resourceKeys, manualEnvNames],
  );
}
