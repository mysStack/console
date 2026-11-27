/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { Suspense } from 'react';
import { Loading } from '@kubed/components';
import { getNativeOverviewMode } from './nativeOverviewModel';
import { useParams } from 'react-router-dom';

import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';

const NativeProjectOverview = React.lazy(() => import('./NativeProjectOverview'));

function Overview(): JSX.Element {
  const { cluster, namespace, workspace } = useParams<'workspace' | 'namespace' | 'cluster'>();
  const url = `//${window.location.host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}/overview`;

  if (getNativeOverviewMode(window.sessionStorage)) {
    return (
      <Suspense fallback={<Loading className="page-loading" />}>
        <NativeProjectOverview />
      </Suspense>
    );
  }
  return <ConsoleV3AliveEmbed url={url} />;
}

export default Overview;
