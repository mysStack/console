/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

const GatewayDetailEmbed = () => {
  const { workspace, cluster = 'cluster', namespace, gatewayName } = useParams();

  const url = `//${window.location.host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}/gateways/${gatewayName}`;

  return <ConsoleV3AliveEmbed url={url} />;
};

export default GatewayDetailEmbed;
