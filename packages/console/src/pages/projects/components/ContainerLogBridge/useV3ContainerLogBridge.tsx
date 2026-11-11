import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NativeContainerLogModal } from './NativeContainerLogModal';
import { parseV3ContainerLogClick } from './parse';

export function useV3ContainerLogBridge() {
  const { cluster, namespace } = useParams<'cluster' | 'namespace'>();
  const [target, setTarget] = useState<{ podName: string; containerName: string } | null>(null);

  const bindContainerLog = useCallback((appWindow: Window) => {
    const handleClick = (event: Event) => {
      const parsed = parseV3ContainerLogClick(event.target);
      if (!parsed) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
      setTarget(parsed);
    };
    appWindow.document.addEventListener('click', handleClick, true);
    return () => appWindow.document.removeEventListener('click', handleClick, true);
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
