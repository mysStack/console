import React from 'react';
import { ContainerLog, FullScreenModal } from '@ks-console/shared';

interface Props {
  cluster?: string;
  namespace?: string;
  podName: string;
  containerName: string;
  onCancel: () => void;
}

export function NativeContainerLogModal({
  cluster,
  namespace,
  podName,
  containerName,
  onCancel,
}: Props) {
  return (
    <FullScreenModal
      zIndex={10000}
      visible
      title={t('CONTAINER_LOGS')}
      footer={null}
      onCancel={onCancel}
    >
      <ContainerLog
        cluster={cluster}
        namespace={namespace}
        podName={podName}
        containerName={containerName}
      />
    </FullScreenModal>
  );
}
