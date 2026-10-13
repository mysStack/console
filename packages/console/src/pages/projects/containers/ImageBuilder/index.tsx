/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import ConsoleV3ResourceList from '../../../../components/ConsoleV3ResourceList';
import { useCacheStore as useStore } from '@ks-console/shared';

function ImageBuilder(): JSX.Element {
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  return <ConsoleV3ResourceList resource="s2ibuilders" url={`${wujieUrlPrefix}/s2ibuilders`} />;
}

export default ImageBuilder;
