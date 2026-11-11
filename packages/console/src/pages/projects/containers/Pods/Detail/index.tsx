/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useRef } from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';
import { useV3ContainerLogBridge } from '../../../components/ContainerLogBridge/useV3ContainerLogBridge';

function PodDetail(): JSX.Element {
  const { podName } = useParams<'podName'>();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const { bindContainerLog, modal: containerLogModal } = useV3ContainerLogBridge();
  const unbindContainerLogRef = useRef<() => void>();

  const handleAfterMount = useCallback(
    (appWindow: Window) => {
      unbindContainerLogRef.current?.();
      unbindContainerLogRef.current = bindContainerLog(appWindow);
    },
    [bindContainerLog],
  );
  const handleAfterUnmount = useCallback(() => {
    unbindContainerLogRef.current?.();
    unbindContainerLogRef.current = undefined;
  }, []);

  return (
    <>
      <WujieReact
        width="100%"
        height="100%"
        name="consolev3"
        url={`${wujieUrlPrefix}/pods/${podName}`}
        sync={false}
        afterMount={handleAfterMount}
        afterUnmount={handleAfterUnmount}
      />
      {containerLogModal}
    </>
  );
}

export default PodDetail;
