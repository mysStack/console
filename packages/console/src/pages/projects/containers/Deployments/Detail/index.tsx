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
      if (appWindow.location.pathname === embeddedPath) return;
      if (routeSyncFrameRef.current !== undefined) {
        appWindow.cancelAnimationFrame(routeSyncFrameRef.current);
      }

      let framesRemaining = 300;
      let stableFrames = 0;
      let previousRootSignature = '';
      const syncRoute = () => {
        const root = appWindow.document.getElementById('root');
        const rootSignature = `${root?.childElementCount ?? 0}:${root?.textContent?.trim() ?? ''}`;
        const routeReady =
          shouldSyncConsoleV3DetailRoute(appWindow.location.pathname, embeddedPath, listPath) &&
          Boolean(root?.hasChildNodes());
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
        if (!routeReady || stableFrames < 3) {
          routeSyncFrameRef.current = undefined;
          return;
        }
        appWindow.history.pushState({}, '', embeddedPath);
        appWindow.dispatchEvent(new PopStateEvent('popstate'));
        routeSyncFrameRef.current = undefined;
      };
      syncRoute();
    },
    [embeddedPath, listPath],
  );
  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      afterMount(appWindow);
      appWindowRef.current = appWindow;
      removeHostHistoryRef.current?.();
      removeHostHistoryRef.current = bindConsoleV3DetailHistory(window, appWindow, {
        projectPrefix,
        name,
        hostDetailPath,
      });
      syncDetailRoute(appWindow);
    },
    [afterMount, hostDetailPath, name, projectPrefix, syncDetailRoute],
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
        sync={false}
        afterMount={handleAfterMount}
        afterUnmount={handleAfterUnmount}
      />
      {inline}
      {summary}
    </>
  );
}

export default DeploymentDetail;
