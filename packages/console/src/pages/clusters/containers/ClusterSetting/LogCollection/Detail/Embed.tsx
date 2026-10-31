/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../../components/ConsoleV3AliveEmbed';

export default function Embed() {
  const params: Record<string, any> = useParams();
  const { cluster, component, name } = params;

  const location = useLocation();

  console.log('why error');
  // eslint-disable-next-line max-len
  const url = `//${window.location.host}/consolev3/clusters/${cluster}/log-collections/${component}/${name}/${location.search}`;
  return <ConsoleV3AliveEmbed url={url} />;
}
