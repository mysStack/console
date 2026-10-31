/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../../components/ConsoleV3AliveEmbed';

const GatewayDetailEmbed = () => {
  const { cluster, component = 'cluster', gatewayName } = useParams();

  // eslint-disable-next-line max-len
  const url = `//${window.location.host}/consolev3/clusters/${cluster}/gateways/${component}/${gatewayName}/gateway-configs`;

  return <ConsoleV3AliveEmbed url={url} />;
};

export default GatewayDetailEmbed;
