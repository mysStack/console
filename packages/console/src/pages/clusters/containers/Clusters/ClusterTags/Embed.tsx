/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import ConsoleV3ResourceList from '../../../../../components/ConsoleV3ResourceList';

/**
 * Shares the `consolev3` app with the other V3 lists; rendering WujieReact
 * directly without `alive` destroyed it for the next page.
 */
export default function Embed() {
  return (
    <ConsoleV3ResourceList
      resource="clusterTags"
      url={`//${window.location.host}/consolev3/clusters/tags`}
    />
  );
}
