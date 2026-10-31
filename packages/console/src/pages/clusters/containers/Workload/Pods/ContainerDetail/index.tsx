/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../../components/ConsoleV3AliveEmbed';

function ContainerDetail(): JSX.Element {
  const params: Record<string, any> = useParams();
  const { cluster, namespace, podName, containerName } = params;

  const url = `//${window.location.host}/consolev3/clusters/${cluster}/projects/${namespace}/pods/${podName}/containers/${containerName}`;

  return <ConsoleV3AliveEmbed url={url} />;
}

export default ContainerDetail;
