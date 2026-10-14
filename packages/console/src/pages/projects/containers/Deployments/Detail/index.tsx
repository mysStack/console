/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useRef } from 'react';
import WujieReact from 'wujie-react';
import { useLocation, useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';
import {
  getConsoleV3DetailPath,
  getConsoleV3DeploymentListPath,
  getConsoleV3DetailUrl,
  getConsoleV3ProjectPrefix,
  bindConsoleV3DetailHistory,
  replaceConsoleV3Route,
  shouldSyncConsoleV3DetailRoute,
} from '../../Base/BaseLayout/route';

function DeploymentDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const location = useLocation();
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('deployments');
  const appWindowRef = useRef<Window>();
  const routeSyncFrameRef = useRef<number>();
  const removeHostHistoryRef = useRef<() => void>();
  const projectPrefix = getConsoleV3ProjectPrefix({
    workspace,
    cluster,
    namespace,
  });
  const hostProjectPath = `/${workspace}/clusters/${cluster}/projects/${namespace}`;
  const hostDetailPath = `${hostProjectPath}/deployments/${name}`;
  const initialHostPath = useRef(location.pathname);
  const embeddedUrl = getConsoleV3DetailUrl({
    host: window.location.host,
    projectPrefix,
    name,
  });
  const embeddedPath = getConsoleV3DetailPath({
    projectPrefix,
    name,
    hostPath: initialHostPath.current,
    hostDetailPath,
  });
  const listPath = getConsoleV3DeploymentListPath(projectPrefix);
  const syncDetailRoute = useCallback(
    (appWindow: Window) => {
      if (routeSyncFrameRef.current !== undefined) {
        appWindow.cancelAnimationFrame(routeSyncFrameRef.current);
      }

      // A reused/preloaded instance may still be on dashboard or another
      // namespace. Bring it to this workload list first so the detail route
      // event is handled by the mounted V3 router instead of a stale page.
      if (appWindow.location.pathname !== listPath) {
        replaceConsoleV3Route(appWindow, listPath);
      }

      let framesRemaining = 300;
      let stableFrames = 0;
      let previousRootSignature = '';
      const syncRoute = () => {
        const root = appWindow.document.getElementById('root');
        const rootSignature = `${root?.childElementCount ?? 0}:${root?.textContent?.trim() ?? ''}`;
        const detailRouteReady =
          appWindow.location.pathname === embeddedPath && Boolean(root?.hasChildNodes());
        const listRouteReady =
          shouldSyncConsoleV3DetailRoute(appWindow.location.pathname, embeddedPath, listPath) &&
          Boolean(root?.hasChildNodes());
        const routeReady = detailRouteReady || listRouteReady;
        if (routeReady && rootSignature === previousRootSignature) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        previousRootSignature = rootSignature;

        if ((!routeReady || stableFrames < 3) && framesRemaining > 0) {
          framesRemaining -= 1;
          routeSyncFrameRef.current = appWindow.requestAnimationFrame(syncRoute);
          return;
        }
        if (detailRouteReady && stableFrames >= 3) {
          routeSyncFrameRef.current = undefined;
          return;
        }
        if (!routeReady || stableFrames < 3) {
          // Keep this diagnostic until the route synchronization race is
          // eliminated; a blank detail page must never fail silently.
          // eslint-disable-next-line no-console
          console.error('[Wujie Deployment] Detail route sync timeout', {
            currentPath: appWindow.location.pathname,
            expectedPath: embeddedPath,
            listPath,
            framesRemaining,
            stableFrames,
            rootExists: Boolean(appWindow.document.getElementById('root')),
          });
          routeSyncFrameRef.current = undefined;
          return;
        }
        replaceConsoleV3Route(appWindow, embeddedPath);
        routeSyncFrameRef.current = undefined;
      };
      syncRoute();
    },
    [embeddedPath, listPath],
  );
  const bindHistory = useCallback(
    (appWindow: Window) => {
      appWindowRef.current = appWindow;
      removeHostHistoryRef.current?.();
      removeHostHistoryRef.current = bindConsoleV3DetailHistory(window, appWindow, {
        projectPrefix,
        name,
        hostDetailPath,
      });
      syncDetailRoute(appWindow);
    },
    [hostDetailPath, name, projectPrefix, syncDetailRoute],
  );
  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      afterMount(appWindow);
      bindHistory(appWindow);
    },
    [afterMount, bindHistory],
  );
  const handleActivated = useCallback(
    (appWindow: Window) => {
      bindHistory(appWindow);
    },
    [bindHistory],
  );
  const handleAfterUnmount = useCallback(() => {
    removeHostHistoryRef.current?.();
    removeHostHistoryRef.current = undefined;
    if (appWindowRef.current && routeSyncFrameRef.current !== undefined) {
      appWindowRef.current.cancelAnimationFrame(routeSyncFrameRef.current);
    }
    appWindowRef.current = undefined;
    routeSyncFrameRef.current = undefined;
    afterUnmount();
  }, [afterUnmount]);

  useEffect(() => () => removeHostHistoryRef.current?.(), []);

  return (
    <>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={embeddedUrl}
        alive
        sync={false}
        afterMount={handleAfterMount}
        activated={handleActivated}
        afterUnmount={handleAfterUnmount}
      />
      {inline}
      {summary}
    </>
  );
}

export default DeploymentDetail;
