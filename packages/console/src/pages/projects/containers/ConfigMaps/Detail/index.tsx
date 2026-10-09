/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';

import { useConfigHistoryEntry } from '../../../components/ConfigHistory/entry';

function ConfigMapDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  // The embedded V3 page has no source to edit, so the entry is injected into its shadow root.
  const historyPortal = useConfigHistoryEntry('ConfigMap', t('CONFIG_HISTORY_TITLE'));

  return (
    <>
      {historyPortal}
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/configmaps/${name}`}
        sync={false}
      />
    </>
  );
}

export default ConfigMapDetail;
