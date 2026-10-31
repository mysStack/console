/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

function PodDetail(): JSX.Element {
  const { podName } = useParams<'podName'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  return <ConsoleV3AliveEmbed url={`${wujieUrlPrefix}/pods/${podName}`} />;
}

export default PodDetail;
