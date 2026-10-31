/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useCacheStore as useStore } from '@ks-console/shared';
import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';

function CustomMonitoring(): JSX.Element {
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  return <ConsoleV3AliveEmbed url={`${wujieUrlPrefix}/custom-monitoring`} />;
}

export default CustomMonitoring;
