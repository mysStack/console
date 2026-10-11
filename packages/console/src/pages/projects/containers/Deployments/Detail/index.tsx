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
  scheduleConsoleV3DetailRoute,
} from '../../Base/BaseLayout/route';

function DeploymentDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const location = useLocation();
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('deployments');
  const appWindowRef = useRef<Window>();
  const cancelRouteSyncRef = useRef<() => void>();
  const projectPrefix = getConsoleV3ProjectPrefix({
    workspace,
    cluster,
    namespace,
  });
  const hostProjectPath = `/${workspace}/clusters/${cluster}/projects/${namespace}`;
  const hostDetailPath = `${hostProjectPath}/deployments/${name}`;
  const currentHostPath = useRef(location.pathname);
  currentHostPath.current = location.pathname;
  const embeddedUrl = getConsoleV3DetailUrl({
    host: window.location.host,
    projectPrefix,
    name,
  });
  const syncHostRoute = useCallback(
    (appWindow: Window) => {
      cancelRouteSyncRef.current?.();
      if (currentHostPath.current === hostDetailPath) return;
      cancelRouteSyncRef.current = scheduleConsoleV3DetailRoute(
        appWindow,
        getConsoleV3DetailPath({
          projectPrefix,
          name,
          hostPath: currentHostPath.current,
          hostDetailPath,
        }),
      );
    },
    [hostDetailPath, name, projectPrefix],
  );
  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      afterMount(appWindow);
      appWindowRef.current = appWindow;
      syncHostRoute(appWindow);
    },
    [afterMount, syncHostRoute],
  );
  const handleAfterUnmount = useCallback(() => {
    cancelRouteSyncRef.current?.();
    appWindowRef.current = undefined;
    cancelRouteSyncRef.current = undefined;
    afterUnmount();
  }, [afterUnmount]);

  useEffect(() => {
    const appWindow = appWindowRef.current;
    if (appWindow) syncHostRoute(appWindow);
  }, [location.pathname, syncHostRoute]);

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
