/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';

import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

function StatefulDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('statefulsets');

  return (
    <>
      <ConsoleV3AliveEmbed
        url={`${wujieUrlPrefix}/statefulsets/${name}`}
        afterMount={afterMount}
        afterUnmount={afterUnmount}
      />
      {inline}
      {summary}
    </>
  );
}

export default StatefulDetail;
