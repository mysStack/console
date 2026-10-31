/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import { isMultiCluster } from '@ks-console/shared';
import { useNavigate } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';

export default function Embed() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMultiCluster()) {
      navigate('/clusters/default/overview');
    }
  }, []);

  if (!isMultiCluster()) {
    return null;
  }

  const url = `//${window.location.host}/consolev3/clusters`;
  return <ConsoleV3AliveEmbed url={url} />;
}
