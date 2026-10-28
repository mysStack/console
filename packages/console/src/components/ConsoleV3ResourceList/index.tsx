import React, { useEffect, useMemo, useRef, useState } from 'react';
import WujieReact from 'wujie-react';

import { getResourceListCacheVersion } from '@ks-console/shared';

import {
  getConsoleV3ScopeKey,
  getConsoleV3VerifyDelayMs,
  isConsoleV3InstanceMounted,
  isConsoleV3ListCacheExpired,
  markConsoleV3Phase,
  normalizeConsoleV3Url,
  shouldRebuildConsoleV3Instance,
} from './metrics';
import { scheduleConsoleV3ListRouteSync } from './route';

const lastScopeUseAt = new Map<string, number>();
const mountedResourceUrls = new Map<string, string>();
const mountedRevisions = new Map<string, string>();
const deactivatedScopes = new Set<string>();
export const DEFAULT_CONSOLE_V3_LIST_CACHE_TTL = 30_000;
const VERIFY_MOUNT_DELAY_MS = 3_000;
// Set once any list mount rendered. A later empty ShadowRoot means another
// caller destroyed the shared app, not that the app is still booting.
let hasRenderedConsoleV3 = false;

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
  const [retryCount, setRetryCount] = useState(0);
  const retriedUrlRef = useRef('');
  // The project layout writes the Wujie URL prefix in an effect. Avoid an
  // initial mount with `undefined/...`; that mount would create a non-reusable
  // Wujie instance before the real resource URL is available.
  // A prefix race can deliver the bare project path; normalize it before the
  // readiness gate, so a single wrong write cannot blank the whole list.
  const resolvedUrl = normalizeConsoleV3Url(url, window.location.host);
  const isReady = resolvedUrl.includes('/consolev3/');
  const revision = getResourceListCacheVersion(resource);
  const user = globals?.user?.username || 'anonymous';
  const scopeKey = isReady ? getConsoleV3ScopeKey(resource, resolvedUrl, user) : '';
  const now = Date.now();
  const lastUsedAt = lastScopeUseAt.get(scopeKey);
  const cacheExpired = isConsoleV3ListCacheExpired(lastUsedAt, now, cacheTtlMs);
  // Keep the iframe URL stable. The revision is used only to decide whether a
  // deactivated instance must be rebuilt after a resource mutation.
  const resourceUrl = resolvedUrl;
  // Reuse the live app across resource scopes: activation syncs the new list
  // route. The mount effect below rebuilds only if the reused app stays empty.
  const shouldRebuild = shouldRebuildConsoleV3Instance({
    cacheExpired,
    deactivated: deactivatedScopes.has(scopeKey),
    mountedRevision: mountedRevisions.get(scopeKey),
    revision,
  });
  if (isReady) {
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
                      hasRenderedConsoleV3 = true;
                      // The first mount of a scope can activate without
                      // `afterMount`; record the rendered revision here too, or
                      // the first return to that scope rebuilds the app.
                      mountedResourceUrls.set(scopeKey, resourceUrl);
                      mountedRevisions.set(scopeKey, revision);
                      if (appWindow) {
                        scheduleConsoleV3ListRouteSync(appWindow, resourceUrl);
                      }
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
    if (shouldRebuild) {
      WujieReact.destroyApp('consolev3');
    }
    setInstanceReady(true);
  }, [isReady, resourceUrl, shouldRebuild]);

  // A reused instance can be an empty ShadowRoot when another caller destroyed
  // it without `alive`. Verify the real DOM once per URL and rebuild only then,
  // so the fast activation path stays available.
  useEffect(() => {
    if (!instanceReady) return;
    const timer = window.setTimeout(
      () => {
        if (isConsoleV3InstanceMounted()) return;
        if (retriedUrlRef.current === resourceUrl) return;
        retriedUrlRef.current = resourceUrl;
        WujieReact.destroyApp('consolev3');
        setRetryCount(count => count + 1);
      },
      getConsoleV3VerifyDelayMs(hasRenderedConsoleV3, VERIFY_MOUNT_DELAY_MS),
    );
    return () => window.clearTimeout(timer);
  }, [instanceReady, resourceUrl, retryCount]);

  if (!isReady || !instanceReady) {
    return <></>;
  }

  return (
    <WujieReact
      width="100%"
      height="100%"
      key={retryCount}
      name="consolev3"
      url={resourceUrl}
      alive
      sync={false}
      {...lifecycle}
    />
  );
}
