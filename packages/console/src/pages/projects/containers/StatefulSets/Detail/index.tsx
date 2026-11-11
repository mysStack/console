/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useRef } from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import { useConfigReferenceBridge } from '../../../components/ConfigReference/entry';
import { useV3ContainerLogBridge } from '../../../components/ContainerLogBridge/useV3ContainerLogBridge';

function StatefulDetail(): JSX.Element {
  const { name } = useParams<'name'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const { afterMount, afterUnmount, inline, summary } = useConfigReferenceBridge('statefulsets');
  const { bindContainerLog, modal: containerLogModal } = useV3ContainerLogBridge();
  const unbindContainerLogRef = useRef<() => void>();

  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      afterMount(appWindow);
      unbindContainerLogRef.current?.();
      unbindContainerLogRef.current = bindContainerLog(appWindow);
    },
    [afterMount, bindContainerLog],
  );
  const handleAfterUnmount = useCallback(() => {
    unbindContainerLogRef.current?.();
    unbindContainerLogRef.current = undefined;
    afterUnmount();
  }, [afterUnmount]);

  return (
    <>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/statefulsets/${name}`}
        alive
        sync={false}
        afterMount={handleAfterMount}
        activated={handleAfterMount}
        afterUnmount={handleAfterUnmount}
      />
      {inline}
      {summary}
      {containerLogModal}
    </>
  );
}

export default StatefulDetail;
