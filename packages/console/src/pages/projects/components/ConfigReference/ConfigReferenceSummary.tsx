import React, { useMemo } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { workloadStore } from '@ks-console/shared';

import { getConfigReferenceSummaryPrefix, getConfigReferenceSummaryRows } from './summary';
import { getContainerEnvFrom, getContainerNames } from './workload';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  containerName?: string;
  refreshKey: number;
}

const storeByModule = {
  deployments: workloadStore('deployments'),
  statefulsets: workloadStore('statefulsets'),
  daemonsets: workloadStore('daemonsets'),
} as const;

export default function ConfigReferenceSummary({
  cluster,
  namespace,
  name,
  module,
  containerName: targetContainerName,
  refreshKey,
}: Props) {
  const detailQuery = storeByModule[module].useGetDetail({ cluster, namespace, name });
  const { refetch } = detailQuery;
  React.useEffect(() => {
    if (refreshKey > 0) refetch?.();
  }, [refetch, refreshKey]);
  const containerNames = useMemo(
    () => (detailQuery.data ? getContainerNames(detailQuery.data as any) : []),
    [detailQuery.data],
  );
  const containerName =
    targetContainerName && containerNames.includes(targetContainerName)
      ? targetContainerName
      : containerNames[0] || '';
  const references = detailQuery.data
    ? getConfigReferenceSummaryRows({
        envFrom: getContainerEnvFrom(detailQuery.data as any, containerName),
      })
    : [];

  if (detailQuery.isLoading || !references.length) return null;

  return (
    <div data-test="config-reference-summary" style={summaryStyle}>
      {references.map((reference, index) => (
        <div key={`${reference.kind}-${reference.name}-${index}`} style={rowStyle}>
          <span style={kindStyle}>{reference.label}</span>
          <span style={nameStyle}>{reference.name}</span>
          {getConfigReferenceSummaryPrefix(reference) && (
            <span style={prefixStyle}>{getConfigReferenceSummaryPrefix(reference)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const summaryStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '130px minmax(0, 1fr) minmax(120px, 0.6fr)',
  gap: 8,
  alignItems: 'center',
  minHeight: 40,
  padding: '0 12px',
  border: '1px solid #c8d3e1',
  borderRadius: 100,
  background: '#eff4f9',
  color: '#36435c',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
};

const kindStyle: React.CSSProperties = { color: '#53657d', textAlign: 'left' };
const nameStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textAlign: 'left',
};
const prefixStyle: React.CSSProperties = { color: '#7b8ba4', textAlign: 'left' };
