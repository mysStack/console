import React, { useMemo } from 'react';
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
const mountedScopes = new Set<string>();
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
  const keepAlive =
    isReady &&
    !cacheExpired &&
    mountedScopes.has(scopeKey) &&
    shouldKeepConsoleV3Alive(activeScopeKey, scopeKey);
  if (isReady) {
    activeScopeKey = scopeKey;
    lastScopeUseAt.set(scopeKey, now);
  }
  const resourceUrl =
    revision === '0:0'
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}ksConsoleV4ListRevision=${revision}`;
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
                  mountedScopes.add(scopeKey);
                  markConsoleV3Phase('afterMount', resourceUrl);
                }
              : phase === 'afterUnmount'
                ? () => {
                    markConsoleV3Phase('afterUnmount', resourceUrl);
                  }
                : phase === 'activated'
                  ? (appWindow?: Window) => {
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
                  : () => markConsoleV3Phase(phase, resourceUrl);
          return callbacks;
        },
        {} as Record<string, (appWindow?: Window) => string | void>,
      ),
    [resourceUrl],
  );

  if (!isReady) {
    return <></>;
  }

  return (
    <WujieReact
      width="100%"
      height="100%"
      name="consolev3"
      url={resourceUrl}
      alive={keepAlive}
      sync={false}
      {...lifecycle}
    />
  );
}
