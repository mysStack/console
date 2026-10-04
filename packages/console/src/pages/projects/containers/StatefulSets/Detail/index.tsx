/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import ConfigReferenceEntry from '../../../components/ConfigReference/entry';

function StatefulDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/statefulsets/${name}`}
        sync={false}
      />
      <ConfigReferenceEntry module="statefulsets" />
    </div>
  );
}

export default StatefulDetail;
