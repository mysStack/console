/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useRef } from 'react';
import WujieReact from 'wujie-react';
import { useLocation, useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';
import {
  getConsoleV3DetailPath,
  getConsoleV3DetailUrl,
  getConsoleV3ProjectPrefix,
} from '../../Base/BaseLayout/route';

function DeploymentDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const location = useLocation();
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('deployments');
  const projectPrefix = getConsoleV3ProjectPrefix({
    workspace,
    cluster,
    namespace,
  });
  const hostProjectPath = `/${workspace}/clusters/${cluster}/projects/${namespace}`;
  const hostDetailPath = `${hostProjectPath}/deployments/${name}`;
  const initialHostPath = useRef(location.pathname);
  const embeddedUrl = getConsoleV3DetailUrl({
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
      if (
        initialHostPath.current === hostDetailPath ||
        appWindow.location.pathname === embeddedPath
      ) {
        return;
      }
      appWindow.history.pushState({}, '', embeddedPath);
      appWindow.dispatchEvent(new appWindow.PopStateEvent('popstate'));
    },
    [afterMount, embeddedPath, hostDetailPath],
  );

  return (
    <>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={embeddedUrl}
        sync={false}
        afterMount={handleAfterMount}
        afterUnmount={afterUnmount}
      />
      {inline}
      {summary}
    </>
  );
}

export default DeploymentDetail;
