/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ConsoleV3ResourceList from '../../../../../components/ConsoleV3ResourceList';

/**
 * Cluster-level list. It shares the `consolev3` app with the project lists, so
 * it uses the same host component: rendering WujieReact directly without
 * `alive` destroyed the shared app and left the next list blank while it
 * booted again.
 */
export default function Embed() {
  const location = useLocation();
  const params: Record<string, any> = useParams();
  const { cluster } = params;

  return (
    <ConsoleV3ResourceList
      resource="pods"
      url={`//${window.location.host}/consolev3/clusters/${cluster}/pods${location.search}`}
    />
  );
}
