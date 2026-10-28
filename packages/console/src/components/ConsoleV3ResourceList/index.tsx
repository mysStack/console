import React, { useEffect, useMemo, useRef, useState } from 'react';
import WujieReact from 'wujie-react';

import { getResourceListCacheVersion } from '@ks-console/shared';

import { watchConsoleV3Sandbox } from './keepAlive';
import type { ConsoleV3AppWindow } from './metrics';
import {
  getConsoleV3InstanceState,
  getConsoleV3ScopeKey,
  isConsoleV3InstanceMounted,
  isConsoleV3ListCacheExpired,
  markConsoleV3Phase,
  normalizeConsoleV3Url,
  shouldRebuildConsoleV3Instance,
} from './metrics';
import { reviveConsoleV3Instance } from './revive';
import { scheduleConsoleV3ListRouteSync } from './route';

const lastScopeUseAt = new Map<string, number>();
const mountedResourceUrls = new Map<string, string>();
const mountedRevisions = new Map<string, string>();
const deactivatedScopes = new Set<string>();
// The child window is the only handle on the shared sandbox once its host
// element is detached, and it is what tells a reusable app from a cleared one.
let lastConsoleV3AppWindow: ConsoleV3AppWindow | undefined;
export const DEFAULT_CONSOLE_V3_LIST_CACHE_TTL = 30_000;
const VERIFY_MOUNT_DELAY_MS = 3_000;

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
  const revivedUrlRef = useRef('');
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
              ? (appWindow?: Window) => {
                  lastConsoleV3AppWindow = appWindow ?? lastConsoleV3AppWindow;
                  watchConsoleV3Sandbox(lastConsoleV3AppWindow?.__WUJIE);
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
                      lastConsoleV3AppWindow = appWindow ?? lastConsoleV3AppWindow;
                      watchConsoleV3Sandbox(lastConsoleV3AppWindow?.__WUJIE);
                      deactivatedScopes.delete(scopeKey);
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
      lastConsoleV3AppWindow = undefined;
      setInstanceReady(true);
      return;
    }
    // An embed without `alive` (cluster and other V3-only routes) clears the
    // shared ShadowRoot on unmount but leaves the sandbox and its scripts
    // loaded. Render the app again in place instead of booting it from zero.
    if (getConsoleV3InstanceState(lastConsoleV3AppWindow) !== 'stale') {
      setInstanceReady(true);
      return;
    }
    let cancelled = false;
    reviveConsoleV3Instance(resourceUrl).then(() => {
      if (!cancelled) setInstanceReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, resourceUrl, shouldRebuild]);

  // A reused instance can be an empty ShadowRoot when another caller destroyed
  // it without `alive`. Verify the real DOM once per URL; render the app again
  // in the surviving sandbox first, and rebuild only if that leaves it empty.
  useEffect(() => {
    if (!instanceReady) return;
    const timer = window.setTimeout(() => {
      if (isConsoleV3InstanceMounted()) return;
      if (retriedUrlRef.current === resourceUrl) return;
      if (
        revivedUrlRef.current !== resourceUrl &&
        getConsoleV3InstanceState(lastConsoleV3AppWindow) === 'stale'
      ) {
        revivedUrlRef.current = resourceUrl;
        reviveConsoleV3Instance(resourceUrl).then(() => setRetryCount(count => count + 1));
        return;
      }
      retriedUrlRef.current = resourceUrl;
      WujieReact.destroyApp('consolev3');
      lastConsoleV3AppWindow = undefined;
      setRetryCount(count => count + 1);
    }, VERIFY_MOUNT_DELAY_MS);
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
