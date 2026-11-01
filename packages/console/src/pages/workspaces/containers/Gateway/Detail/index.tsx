/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

const GatewayDetailEmbed = () => {
  const { workspace, component = 'cluster', gatewayName } = useParams();

  const url = `//${window.location.host}/consolev3/workspaces/${workspace}/gateways/${component}/${gatewayName}`;

  return <ConsoleV3AliveEmbed url={url} />;
};

export default GatewayDetailEmbed;
