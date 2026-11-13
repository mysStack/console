/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Button } from '@kubed/components';
import { normalizeConsoleV3Url } from '../../../../components/ConsoleV3ResourceList/metrics';
import ConsoleV3ResourceList from '../../../../components/ConsoleV3ResourceList';
import { useCacheStore as useStore } from '@ks-console/shared';

function Deployments(): JSX.Element {
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');

  const url = `${wujieUrlPrefix}/deployments`;
  const standaloneUrl = normalizeConsoleV3Url(url, window.location.host);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {standaloneUrl.includes('/consolev3/') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button
            data-test="deployment-standalone-entry"
            onClick={() => window.location.assign(standaloneUrl)}
          >
            {t('DEPLOYMENT_INDEPENDENT_VIEW')}
          </Button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ConsoleV3ResourceList resource="deployments" url={url} />
      </div>
    </div>
  );
}

export default Deployments;
