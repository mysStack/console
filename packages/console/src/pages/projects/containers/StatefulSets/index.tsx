/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import ConsoleV3ResourceList from '../../../../components/ConsoleV3ResourceList';
import { useCacheStore as useStore } from '@ks-console/shared';

function StatefulSets(): JSX.Element {
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  return <ConsoleV3ResourceList resource="statefulsets" url={`${wujieUrlPrefix}/statefulsets`} />;
}

export default StatefulSets;
