import React, { useEffect, useMemo, useState } from 'react';
import WujieReact from 'wujie-react';

import { getResourceListCacheVersion } from '@ks-console/shared';

import {
  getConsoleV3ScopeKey,
  isConsoleV3ListCacheExpired,
  markConsoleV3Phase,
  shouldKeepConsoleV3Alive,
} from './metrics';

let activeScopeKey: string | undefined;
const lastScopeUseAt = new Map<string, number>();
const mountedResourceUrls = new Map<string, string>();
const mountedRevisions = new Map<string, string>();
const deactivatedScopes = new Set<string>();
export const DEFAULT_CONSOLE_V3_LIST_CACHE_TTL = 30_000;

export interface ConsoleV3ResourceListProps {
  resource: string;
  url: string;
  cacheTtlMs?: number;
}

/**
 * Resource lists share one V3 application. Keeping the app alive turns a list
 * return into Wujie's activate path, so the V3 store, table state and scroll
 * position survive a native V4 detail route.
 */
export default function ConsoleV3ResourceList({
  resource,
  url,
  cacheTtlMs = DEFAULT_CONSOLE_V3_LIST_CACHE_TTL,
}: ConsoleV3ResourceListProps): JSX.Element {
  const [instanceReady, setInstanceReady] = useState(false);
  // The project layout writes the Wujie URL prefix in an effect. Avoid an
  // initial mount with `undefined/...`; that mount would create a non-reusable
  // Wujie instance before the real resource URL is available.
  const isReady = url.includes('/consolev3/');
  const revision = getResourceListCacheVersion(resource);
  const user = globals?.user?.username || 'anonymous';
  const scopeKey = isReady ? getConsoleV3ScopeKey(resource, url, user) : '';
  const now = Date.now();
  const lastUsedAt = lastScopeUseAt.get(scopeKey);
  const cacheExpired = isConsoleV3ListCacheExpired(lastUsedAt, now, cacheTtlMs);
  // Keep the iframe URL stable. The revision is used only to decide whether a
  // deactivated instance must be rebuilt after a resource mutation.
  const resourceUrl = url;
  const canRestore =
    !cacheExpired &&
    mountedResourceUrls.get(scopeKey) === resourceUrl &&
    (!deactivatedScopes.has(scopeKey) || mountedRevisions.get(scopeKey) === revision) &&
    shouldKeepConsoleV3Alive(activeScopeKey, scopeKey);
  if (isReady) {
    activeScopeKey = scopeKey;
    lastScopeUseAt.set(scopeKey, now);
  }
  const lifecycle = useMemo(
    () =>
      (
        [
          'beforeMount',
          'afterMount',
          'activated',
          'deactivated',
          'beforeUnmount',
          'afterUnmount',
        ] as const
      ).reduce(
        (callbacks, phase) => {
          callbacks[phase] =
            phase === 'afterMount'
              ? () => {
                  mountedResourceUrls.set(scopeKey, resourceUrl);
                  mountedRevisions.set(scopeKey, revision);
                  markConsoleV3Phase('afterMount', resourceUrl);
                }
              : phase === 'afterUnmount'
                ? () => {
                    markConsoleV3Phase('afterUnmount', resourceUrl);
                  }
                : phase === 'activated'
                  ? (appWindow?: Window) => {
                      deactivatedScopes.delete(scopeKey);
                      markConsoleV3Phase('activated', resourceUrl);
                      if (appWindow?.requestAnimationFrame) {
                        appWindow.requestAnimationFrame(() =>
                          markConsoleV3Phase('render', resourceUrl),
                        );
                      } else {
                        window.requestAnimationFrame(() =>
                          markConsoleV3Phase('render', resourceUrl),
                        );
                      }
                    }
                  : phase === 'deactivated'
                    ? () => {
                        deactivatedScopes.add(scopeKey);
                        markConsoleV3Phase('deactivated', resourceUrl);
                      }
                    : () => markConsoleV3Phase(phase, resourceUrl);
          return callbacks;
        },
        {} as Record<string, (appWindow?: Window) => string | void>,
      ),
    [resourceUrl, revision, scopeKey],
  );

  useEffect(() => {
    if (!isReady) return;
    if (!canRestore) {
      WujieReact.destroyApp('consolev3');
    }
    setInstanceReady(true);
  }, [canRestore, isReady, resourceUrl]);

  if (!isReady || !instanceReady) {
    return <></>;
  }

  return (
    <WujieReact
      width="100%"
      height="100%"
      name="consolev3"
      url={resourceUrl}
      alive
      sync={false}
      {...lifecycle}
    />
  );
}
