import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NativeContainerLogModal } from './NativeContainerLogModal';
import { bindV3ContainerLogClick, collectV3ContainerLogRoots } from './bind';

export function useV3ContainerLogBridge() {
  const { cluster, namespace } = useParams<'cluster' | 'namespace'>();
  const [target, setTarget] = useState<{ podName: string; containerName: string } | null>(null);

  const bindContainerLog = useCallback((appWindow: Window) => {
    const hostDocument = window.document;
    const app = hostDocument.querySelector('wujie-app[data-wujie-id="consolev3"]');
    return bindV3ContainerLogClick(
      collectV3ContainerLogRoots(hostDocument, appWindow, app?.shadowRoot),
      setTarget,
    );
  }, []);

  const modal =
    target && cluster && namespace ? (
      <NativeContainerLogModal
        cluster={cluster}
        namespace={namespace}
        podName={target.podName}
        containerName={target.containerName}
        onCancel={() => setTarget(null)}
      />
    ) : null;

  return { bindContainerLog, modal };
}
