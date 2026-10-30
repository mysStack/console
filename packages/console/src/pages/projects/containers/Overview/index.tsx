/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import WujieReact from 'wujie-react';

import { watchConsoleV3Sandbox } from '../../../../components/ConsoleV3ResourceList/keepAlive';
import type { ConsoleV3AppWindow } from '../../../../components/ConsoleV3ResourceList/metrics';
import { scheduleConsoleV3ListRouteSync } from '../../../../components/ConsoleV3ResourceList/route';

function Overview(): JSX.Element {
  const { cluster, namespace, workspace } = useParams<'workspace' | 'namespace' | 'cluster'>();
  const url = `//${window.location.host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}/overview`;

  const bindSandbox = (appWindow?: Window) => {
    const child = appWindow as ConsoleV3AppWindow | undefined;
    watchConsoleV3Sandbox(child?.__WUJIE);
    if (child) {
      scheduleConsoleV3ListRouteSync(child, url);
    }
  };

  return (
    <WujieReact
      width="100%"
      height="100%"
      name="consolev3"
      url={url}
      alive
      sync={false}
      afterMount={bindSandbox}
      activated={bindSandbox}
    />
  );
}

export default Overview;
