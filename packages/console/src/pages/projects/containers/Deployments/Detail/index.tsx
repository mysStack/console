/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useRef } from 'react';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';
import { useLocation, useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';
import { useV3ContainerLogBridge } from '../../../components/ContainerLogBridge/useV3ContainerLogBridge';
import { bindConsoleV3DetailHistory, getConsoleV3DetailUrl } from '../../Base/BaseLayout/route';

function DeploymentDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const location = useLocation();
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('deployments');
  const { bindContainerLog, modal: containerLogModal } = useV3ContainerLogBridge();
  const removeHostHistoryRef = useRef<() => void>();
  const unbindContainerLogRef = useRef<() => void>();
  const hostDetailPath = `/${workspace}/clusters/${cluster}/projects/${namespace}/deployments/${name}`;
  const embeddedUrl = getConsoleV3DetailUrl({
    host: window.location.host,
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  });

  const bindHistory = useCallback(
    (appWindow: Window) => {
      removeHostHistoryRef.current?.();
      removeHostHistoryRef.current = bindConsoleV3DetailHistory(window, appWindow, hostDetailPath);
    },
    [hostDetailPath],
  );
  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      afterMount(appWindow);
      bindHistory(appWindow);
      unbindContainerLogRef.current?.();
      unbindContainerLogRef.current = bindContainerLog(appWindow);
    },
    [afterMount, bindContainerLog, bindHistory],
  );
  const handleAfterUnmount = useCallback(() => {
    unbindContainerLogRef.current?.();
    unbindContainerLogRef.current = undefined;
    removeHostHistoryRef.current?.();
    removeHostHistoryRef.current = undefined;
    afterUnmount();
  }, [afterUnmount]);

  useEffect(() => () => removeHostHistoryRef.current?.(), []);

  return (
    <>
      <ConsoleV3AliveEmbed
        width="100%"
        height="100%"
        url={embeddedUrl}
        afterMount={handleAfterMount}
        activated={handleAfterMount}
        afterUnmount={handleAfterUnmount}
      />
      {inline}
      {summary}
      {containerLogModal}
    </>
  );
}

export default DeploymentDetail;
