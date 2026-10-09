/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';

import { useConfigHistoryEntry } from '../../../components/ConfigHistory/entry';
import { formatTime, managedByLabelKey } from '../../../components/ConfigHistory/index';

function SecretDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  // The embedded V3 page has no source to edit, so the entry is injected into its shadow root.
  const history = useConfigHistoryEntry(
    'Secret',
    t('CONFIG_HISTORY_TITLE'),
    record => t(managedByLabelKey(record.managedBy)),
    formatTime,
  );

  return (
    <>
      {history.portal}
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/secrets/${name}`}
        sync={false}
      />
    </>
  );
}

export default SecretDetail;
