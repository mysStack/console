/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import { isMultiCluster } from '@ks-console/shared';
import { useNavigate } from 'react-router-dom';
import ConsoleV3ResourceList from '../../../../components/ConsoleV3ResourceList';

/**
 * Shares the `consolev3` app with the other V3 lists; rendering WujieReact
 * directly without `alive` destroyed it for the next page.
 */
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

  return (
    <ConsoleV3ResourceList
      resource="clusters"
      url={`//${window.location.host}/consolev3/clusters`}
    />
  );
}
