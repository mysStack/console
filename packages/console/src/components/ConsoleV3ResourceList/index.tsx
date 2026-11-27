import React, { useEffect, useMemo, useRef, useState } from 'react';
import WujieReact from 'wujie-react';
import { useLocation } from 'react-router-dom';

import { getResourceListCacheVersion } from '@ks-console/shared';

import { watchConsoleV3Sandbox } from './keepAlive';
import type { ConsoleV3AppWindow } from './metrics';
import {
  getConsoleV3ScopeKey,
  isConsoleV3InstanceMounted,
  markConsoleV3Phase,
  normalizeConsoleV3Url,
  shouldRebuildConsoleV3Instance,
} from './metrics';
import { alignConsoleV3Url, scheduleConsoleV3ListRouteSync } from './route';

const mountedResourceUrls = new Map<string, string>();
const mountedRevisions = new Map<string, string>();
const deactivatedScopes = new Set<string>();
const VERIFY_MOUNT_DELAY_MS = 3_000;

export interface ConsoleV3ResourceListProps {
  resource: string;
  url: string;
}

/**
 * Resource lists share one V3 application. Keeping the app alive turns a list
 * return into Wujie's activate path, so the V3 store, table state and scroll
 * position survive a native V4 detail route.
 */
export default function ConsoleV3ResourceList({
  resource,
  url,
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
  // Keep the iframe URL stable. The revision is used only to decide whether a
  // deactivated instance must be rebuilt after a resource mutation.
  const location = useLocation();
  const resourceUrl = alignConsoleV3Url(resolvedUrl, location);
  // Reuse the live app across resource scopes: activation syncs the new list
  // route. Rebuild a previously deactivated scope only after a data mutation.
  const shouldRebuild = shouldRebuildConsoleV3Instance({
    deactivated: deactivatedScopes.has(scopeKey),
    mountedRevision: mountedRevisions.get(scopeKey),
    revision,
  });
  const lifecycle = useMemo(
    () =>
      (
        [
          'beforeLoad',
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
            phase === 'beforeLoad'
              ? () => {
                  deactivatedScopes.delete(scopeKey);
                  mountedRevisions.set(scopeKey, revision);
                  mountedResourceUrls.set(scopeKey, resourceUrl);
                }
              : phase === 'afterMount'
                ? (appWindow?: ConsoleV3AppWindow) => {
                    watchConsoleV3Sandbox(appWindow?.__WUJIE);
                    if (appWindow) {
                      scheduleConsoleV3ListRouteSync(
                        appWindow,
                        resourceUrl,
                        window.location.pathname,
                      );
                    }
                    mountedResourceUrls.set(scopeKey, resourceUrl);
                    mountedRevisions.set(scopeKey, revision);
                    markConsoleV3Phase('afterMount', resourceUrl);
                  }
                : phase === 'afterUnmount'
                  ? () => {
                      markConsoleV3Phase('afterUnmount', resourceUrl);
                    }
                  : phase === 'activated'
                    ? (appWindow?: ConsoleV3AppWindow) => {
                        watchConsoleV3Sandbox(appWindow?.__WUJIE);
                        deactivatedScopes.delete(scopeKey);
                        // The first mount of a scope can activate without
                        // `afterMount`; record the rendered revision here too, or
                        // the first return to that scope rebuilds the app.
                        mountedResourceUrls.set(scopeKey, resourceUrl);
                        mountedRevisions.set(scopeKey, revision);
                        if (appWindow) {
                          scheduleConsoleV3ListRouteSync(
                            appWindow,
                            resourceUrl,
                            window.location.pathname,
                          );
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
    // Wujie owns the shared sandbox, including instances booted by overview
    // and detail pages. A detached host is normal during an alive activation.
    setInstanceReady(true);
  }, [isReady, resourceUrl, shouldRebuild]);

  // Recover a genuinely empty mount once, after Wujie has had a chance to
  // activate its existing sandbox. The independent V3 bundle renders itself
  // and does not expose a Wujie mount hook for a detached revival.
  useEffect(() => {
    if (!instanceReady) return;
    const timer = window.setTimeout(() => {
      if (isConsoleV3InstanceMounted()) return;
      if (retriedUrlRef.current === resourceUrl) return;
      retriedUrlRef.current = resourceUrl;
      WujieReact.destroyApp('consolev3');
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
