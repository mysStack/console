import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfigReferencePanel from './ConfigReferencePanel';
import type { WorkloadKind } from '../WorkloadForm/types';

const MODULES: Record<WorkloadKind, { kind: string; label: string }> = {
  deployments: { kind: 'Deployment', label: 'Deployment' },
  statefulsets: { kind: 'StatefulSet', label: 'StatefulSet' },
  daemonsets: { kind: 'DaemonSet', label: 'DaemonSet' },
};

export default function ConfigReferencePage({ module }: { module: WorkloadKind }) {
  const { workspace = '', cluster = '', namespace = '', name = '' } = useParams();
  const navigate = useNavigate();
  const workload = MODULES[module];
  const detailPath = [
    workspace ? `/${workspace}` : '',
    `/clusters/${cluster}/projects/${namespace}/${module}/${name}`,
  ].join('');

  return (
    <ConfigReferencePanel
      cluster={cluster}
      namespace={namespace}
      name={name}
      module={module}
      workloadKind={workload.label}
      onBack={() => navigate(detailPath)}
    />
  );
}
