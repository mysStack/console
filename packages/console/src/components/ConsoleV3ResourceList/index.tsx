import React, { useEffect, useMemo, useRef, useState } from 'react';
import WujieReact from 'wujie-react';

import { getResourceListCacheVersion } from '@ks-console/shared';

import {
  isConsoleV3BootInFlight,
  markConsoleV3BootFailed,
  markConsoleV3BootMounted,
  markConsoleV3BootStarted,
} from './bootPhase';
import { destroyConsoleV3Instance } from './destroy';
import { watchConsoleV3Sandbox } from './keepAlive';
import type { ConsoleV3AppWindow } from './metrics';
import {
  getConsoleV3InstanceState,
  getConsoleV3Sandbox,
  getConsoleV3ScopeKey,
  isConsoleV3InstanceMounted,
  markConsoleV3Phase,
  normalizeConsoleV3Url,
  shouldRebuildConsoleV3Instance,
} from './metrics';
import { reviveConsoleV3Instance } from './revive';
import { scheduleConsoleV3ListRouteSync } from './route';

const mountedResourceUrls = new Map<string, string>();
const mountedRevisions = new Map<string, string>();
const deactivatedScopes = new Set<string>();
// The child window is the only handle on the shared sandbox once its host
// element is detached, and it is what tells a reusable app from a cleared one.
let lastConsoleV3AppWindow: ConsoleV3AppWindow | undefined;
const VERIFY_MOUNT_DELAY_MS = 3_000;

/** Prefer the last known `__WUJIE`; DOM lookup fails when ShadowRoot is empty. */
const resolveConsoleV3Sandbox = () => lastConsoleV3AppWindow?.__WUJIE ?? getConsoleV3Sandbox();

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
  // Verify-path rebuild gate. Must stay separate from activatedRebuildRef:
  // an empty activate already consumes one immediate rebuild; verify is the
  // last insurance and must not share that token (or a second empty husk
  // blanks the URL for the rest of the page lifetime).
  const retriedUrlRef = useRef('');
  const activatedRebuildRef = useRef('');
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
  // Keep the iframe URL stable. The revision is used only to decide whether a
  // deactivated instance must be rebuilt after a resource mutation.
  const resourceUrl = resolvedUrl;
  // Reuse the live app across resource scopes: activation syncs the new list
  // route. The mount effect below rebuilds only if the reused app stays empty.
  const shouldRebuild = shouldRebuildConsoleV3Instance({
    deactivated: deactivatedScopes.has(scopeKey),
    mountedRevision: mountedRevisions.get(scopeKey),
    revision,
  });
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
                  const ensure = (window as unknown as Record<string, unknown>)[
                    '__KS_ENSURE_CONSOLE_V3_LIST_SEED__'
                  ];
                  if (typeof ensure === 'function') {
                    (ensure as (w?: Window) => void)(appWindow);
                  }
                  markConsoleV3BootMounted();
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
                      const ensure = (window as unknown as Record<string, unknown>)[
                        '__KS_ENSURE_CONSOLE_V3_LIST_SEED__'
                      ];
                      if (typeof ensure === 'function') {
                        (ensure as (w?: Window) => void)(appWindow);
                      }
                      watchConsoleV3Sandbox(lastConsoleV3AppWindow?.__WUJIE);
                      deactivatedScopes.delete(scopeKey);
                      // The first mount of a scope can activate without
                      // `afterMount`; record the rendered revision here too, or
                      // the first return to that scope rebuilds the app.
                      mountedResourceUrls.set(scopeKey, resourceUrl);
                      mountedRevisions.set(scopeKey, revision);
                      if (appWindow) {
                        // Only sync when the child is on another path. A cold
                        // start that already preloaded `resourceUrl` is already
                        // there; forcing popstate refetches the list.
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
                      // A non-alive peer (or cleared preload husk) can activate
                      // with an empty ShadowRoot. Settling `mounted` then lets
                      // the 3s verify timer wait before destroy — SPA visible
                      // time jumps to ~8s. Rebuild immediately instead.
                      if (!isConsoleV3InstanceMounted()) {
                        if (activatedRebuildRef.current === resourceUrl) {
                          // Immediate rebuild already failed once; stop spinning
                          // and leave verify free to try its own path once.
                          markConsoleV3BootFailed();
                          return;
                        }
                        activatedRebuildRef.current = resourceUrl;
                        markConsoleV3BootStarted();
                        void destroyConsoleV3Instance(resolveConsoleV3Sandbox(), () =>
                          WujieReact.destroyApp('consolev3'),
                        ).then(() => {
                          lastConsoleV3AppWindow = undefined;
                          setRetryCount(count => count + 1);
                        });
                        return;
                      }
                      markConsoleV3BootMounted();
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
    // SPA entries (overview → list) miss initWujie route priming; kick the
    // host list seed as soon as the embed URL is known.
    const primer = (window as unknown as Record<string, unknown>)[
      '__KS_PRIME_CONSOLE_V3_LIST_SEED__'
    ];
    if (typeof primer === 'function') {
      (primer as (pathname: string) => void)(window.location.pathname);
    }
  }, [isReady, resourceUrl]);

  useEffect(() => {
    if (!isReady) return;
    if (shouldRebuild) {
      // The rebuild starts a fresh boot below. Enter `booting` here, or the
      // verify timer would destroy the sandbox while it is still loading.
      markConsoleV3BootStarted();
      destroyConsoleV3Instance(resolveConsoleV3Sandbox(), () => WujieReact.destroyApp('consolev3'));
      lastConsoleV3AppWindow = undefined;
      setInstanceReady(true);
      return;
    }
    // An embed without `alive` (cluster and other V3-only routes) clears the
    // shared ShadowRoot on unmount but leaves the sandbox and its scripts
    // loaded. Render the app again in place instead of booting it from zero.
    // Entering such a route first leaves no child window here, and the cleared
    // sandbox renders nothing when activated. `destroyApp` cannot clear that
    // husk on a cold page load either: it also destroys the instance `preloadApp`
    // is still filling in. Wujie 1.0.25 `destroy()` does not await the sandbox
    // unmount, so the rest of that preload runs against a nulled document and
    // the page reports `null._cacheListeners`. Boot on the existing instance
    // instead; wujie-react awaits the running preload, and the verify timer
    // below rebuilds only if this route really left an empty husk.
    if (!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted()) {
      // Prefix re-writes can remount this host while the first boot still loads
      // the V3 bundle. Stay in `booting` instead of treating the empty
      // ShadowRoot as a failed mount; wujie-react queues the newer startApp.
      if (!isConsoleV3BootInFlight()) {
        markConsoleV3BootStarted();
      }
      setInstanceReady(true);
      return;
    }
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
    let cancelled = false;
    let timer = 0;
    const verify = () => {
      if (cancelled) return;
      if (isConsoleV3InstanceMounted()) return;
      // Lifecycle has not settled yet: keep waiting. Protection ends on
      // afterMount/activated (or the hung-boot watchdog), not on a wall clock.
      if (isConsoleV3BootInFlight()) {
        timer = window.setTimeout(verify, VERIFY_MOUNT_DELAY_MS);
        return;
      }
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
      markConsoleV3BootStarted();
      destroyConsoleV3Instance(resolveConsoleV3Sandbox(), () =>
        WujieReact.destroyApp('consolev3'),
      ).then(() => {
        if (cancelled) return;
        lastConsoleV3AppWindow = undefined;
        setRetryCount(count => count + 1);
      });
    };
    timer = window.setTimeout(verify, VERIFY_MOUNT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
