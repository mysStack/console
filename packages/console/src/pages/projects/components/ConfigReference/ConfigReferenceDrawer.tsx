import React from 'react';
import { Drawer } from '@kubed/components';
import { Icon } from '@ks-console/shared';

import ConfigReferencePanel from './ConfigReferencePanel';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

interface Props {
  visible: boolean;
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  workloadKind: string;
  onClose: () => void;
}

const workloadLabels: Record<WorkloadModule, string> = {
  deployments: 'Deployment',
  statefulsets: 'StatefulSet',
  daemonsets: 'DaemonSet',
};

export default function ConfigReferenceDrawer({
  visible,
  cluster,
  namespace,
  name,
  module,
  workloadKind,
  onClose,
}: Props) {
  return (
    <Drawer
      visible={visible}
      placement="right"
      width={680}
      maskClosable
      onClose={onClose}
      contentWrapperStyle={{ background: '#f7f9fc' }}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px 18px',
            background: '#fff',
            borderBottom: '1px solid #d9e2ec',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#27364b',
                fontSize: 20,
                fontWeight: 600,
                lineHeight: '28px',
              }}
            >
              {t('CONFIG_REFERENCE')}
            </div>
            <div
              style={{
                overflow: 'hidden',
                marginTop: 4,
                color: '#718096',
                fontSize: 13,
                lineHeight: '20px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${workloadKind || workloadLabels[module]} · ${name}`}
            >
              {workloadKind || workloadLabels[module]} · {name}
            </div>
          </div>
          <button
            type="button"
            aria-label={t('CONFIG_REFERENCE_CLOSE')}
            onClick={onClose}
            style={{
              display: 'inline-flex',
              flex: '0 0 auto',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              padding: 0,
              color: '#526273',
              background: '#eef3f8',
              border: 0,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Icon name="close" size={18} color="#526273" />
          </button>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
          <ConfigReferencePanel
            cluster={cluster}
            namespace={namespace}
            name={name}
            module={module}
            workloadKind={workloadKind || workloadLabels[module]}
            embedded
            onBack={onClose}
          />
        </div>
      </div>
    </Drawer>
  );
}
