/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

export default function Embed() {
  const location = useLocation();

  const params: Record<string, any> = useParams();
  const { cluster } = params;

  const url = `//${window.location.host}/consolev3/clusters/${cluster}/daemonsets${location.search}`;
  return <ConsoleV3AliveEmbed url={url} />;
}
