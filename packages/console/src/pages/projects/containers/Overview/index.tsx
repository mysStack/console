/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';

function Overview(): JSX.Element {
  const { cluster, namespace, workspace } = useParams<'workspace' | 'namespace' | 'cluster'>();
  const url = `//${window.location.host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}/overview`;

  return <ConsoleV3AliveEmbed url={url} />;
}

export default Overview;
