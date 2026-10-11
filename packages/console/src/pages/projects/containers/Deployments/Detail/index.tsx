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
  getConsoleV3DetailUrl,
  getConsoleV3ProjectPrefix,
  bindConsoleV3DetailHistory,
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
      if (
        initialHostPath.current === hostDetailPath ||
        appWindow.location.pathname === embeddedPath
      ) {
        return;
      }

      let framesRemaining = 300;
      const syncRoute = () => {
        const root = appWindow.document.getElementById('root');
        if (!root?.hasChildNodes() && framesRemaining > 0) {
          framesRemaining -= 1;
          routeSyncFrameRef.current = appWindow.requestAnimationFrame(syncRoute);
          return;
        }
        if (!root?.hasChildNodes()) {
          routeSyncFrameRef.current = undefined;
          return;
        }
        appWindow.history.pushState({}, '', embeddedPath);
        appWindow.dispatchEvent(new PopStateEvent('popstate'));
        routeSyncFrameRef.current = undefined;
      };
      syncRoute();
    },
    [afterMount, embeddedPath, hostDetailPath, name, projectPrefix],
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
