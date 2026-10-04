/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';

function StatefulDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const { afterMount, afterUnmount, drawer } = useConfigReferenceBridge('statefulsets');

  return (
    <>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/statefulsets/${name}`}
        sync={false}
        afterMount={afterMount}
        afterUnmount={afterUnmount}
      />
      {drawer}
    </>
  );
}

export default StatefulDetail;
