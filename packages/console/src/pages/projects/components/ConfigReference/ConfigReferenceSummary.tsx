import React, { useMemo } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { workloadStore } from '@ks-console/shared';

import { getConfigReferenceSummaryPrefix, getConfigReferenceSummaryRows } from './summary';
import { getContainerEnvFrom, getContainerNames } from './workload';
import ConfigReferencePreview from './ConfigReferencePreview';
import { useReferencePreviews } from './useReferencePreviews';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  containerName?: string;
  refreshKey: number;
  /**
   * 'dialog' renders under the container editor's action row; 'envTab' is the
   * read-only environment-variables page, where this is the only thing that can
   * show what envFrom actually contributes (that page lists `env` only).
   */
  variant?: 'dialog' | 'envTab';
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
  variant = 'dialog',
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
  const references = useMemo(
    () =>
      detailQuery.data
        ? getConfigReferenceSummaryRows({
            envFrom: getContainerEnvFrom(detailQuery.data as any, containerName),
          })
        : [],
    [detailQuery.data, containerName],
  );

  const previews = useReferencePreviews(references, cluster, namespace);

  if (detailQuery.isLoading || !references.length) {
    return null;
  }

  const total = previews.reduce(
    (sum, preview) => sum + (preview.resolved ? preview.names.length : 0),
    0,
  );
  const unresolved = previews.filter(preview => !preview.resolved).length;

  return (
    <div
      data-test="config-reference-summary"
      style={variant === 'envTab' ? envTabStyle : summaryStyle}
    >
      {variant === 'envTab' && (
        <div style={titleStyle}>
          <span>{t('CONFIG_REFERENCE')}</span>
          <span style={totalStyle}>
            {total > 0 ? t('CONFIG_REFERENCE_TOTAL', { count: total }) : ''}
            {unresolved > 0
              ? ` · ${t('CONFIG_REFERENCE_TOTAL_PARTIAL', { count: unresolved })}`
              : ''}
          </span>
        </div>
      )}
      {references.map((reference, index) => (
        <div key={`${reference.kind}-${reference.name}-${index}`} style={rowWrapperStyle}>
          <div style={rowStyle}>
            <span style={kindStyle}>{reference.label}</span>
            <span style={nameStyle}>{reference.name}</span>
            {getConfigReferenceSummaryPrefix(reference) && (
              <span style={prefixStyle}>{getConfigReferenceSummaryPrefix(reference)}</span>
            )}
          </div>
          <ConfigReferencePreview
            kind={reference.kind}
            identity={`${reference.kind}:${reference.name}:${reference.prefix || ''}`}
            preview={previews[index]}
          />
        </div>
      ))}
      {variant === 'envTab' && total === 0 && unresolved === 0 && (
        <div style={hintStyle}>{t('CONFIG_REFERENCE_PREVIEW_EMPTY')}</div>
      )}
    </div>
  );
}

const summaryStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
};

const envTabStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginBottom: 16,
  padding: '12px 16px',
  border: '1px solid #e5e9f2',
  borderRadius: 4,
  background: '#f7f9fb',
};

const titleStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'baseline',
  color: '#36435c',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'left',
};

const totalStyle: React.CSSProperties = {
  color: '#55bc8a',
  fontSize: 12,
  fontWeight: 600,
};

const hintStyle: React.CSSProperties = {
  color: '#9aa7b8',
  fontSize: 12,
  textAlign: 'left',
};

const rowWrapperStyle: React.CSSProperties = { display: 'grid', gap: 2 };

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
