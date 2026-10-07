import React, { useMemo, useState } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { workloadStore } from '@ks-console/shared';

import { getConfigReferenceSummaryPrefix, getConfigReferenceSummaryRows } from './summary';
import { getContainerEnvFrom, getContainerNames } from './workload';
import ConfigReferencePreview from './ConfigReferencePreview';
import { useReferencePreviews } from './useReferencePreviews';
import { summaryHeaderToggleStyle } from './styles';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  containerName?: string;
  /**
   * Position of this block's container card on the page. Used only when
   * `containerName` cannot be matched against the workload's containers.
   */
  containerIndex?: number;
  /**
   * How many container cards the page rendered. The positional fallback below is
   * only safe when there is exactly one card per container.
   */
  containerCount?: number;
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
  containerIndex,
  containerCount,
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
  /**
   * Which container this block describes.
   *
   * Only a name that actually matches the workload's containers is trusted. The
   * positional fallback applies solely when the page rendered exactly one card per
   * container: with init containers it renders more, and matching by position would
   * then put one container's references under another container's heading — worse
   * than showing nothing at all, so an unresolvable card renders nothing.
   */
  const containerName = useMemo(() => {
    if (targetContainerName && containerNames.includes(targetContainerName)) {
      return targetContainerName;
    }
    if (containerCount !== undefined && containerCount === containerNames.length) {
      return containerNames[containerIndex ?? 0] || '';
    }
    return '';
  }, [targetContainerName, containerIndex, containerCount, containerNames]);
  const references = useMemo(
    () =>
      detailQuery.data && containerName
        ? getConfigReferenceSummaryRows({
            envFrom: getContainerEnvFrom(detailQuery.data as any, containerName),
          })
        : [],
    [detailQuery.data, containerName],
  );

  const previews = useReferencePreviews(references, cluster, namespace);

  // Expand state lives here rather than inside each row so the header control can
  // drive every row at once. Default is collapsed: the per-row warning line stays
  // visible either way, so nothing that matters is hidden by collapsing.
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  if (detailQuery.isLoading || !references.length) {
    return null;
  }

  const total = previews.reduce(
    (sum, preview) => sum + (preview.resolved ? preview.names.length : 0),
    0,
  );
  const unresolved = previews.filter(preview => !preview.resolved).length;
  const allExpanded = references.every((_, index) => expandedRows[index]);
  const toggleAll = () => {
    const next = !allExpanded;
    const state: Record<number, boolean> = {};
    references.forEach((_, index) => {
      state[index] = next;
    });
    setExpandedRows(state);
  };

  return (
    <div
      data-test="config-reference-summary"
      style={variant === 'envTab' ? envTabStyle : summaryStyle}
    >
      <div style={titleStyle}>
        <span>{t('CONFIG_REFERENCE')}</span>
        <span style={totalStyle}>
          {total > 0 ? t('CONFIG_REFERENCE_TOTAL', { count: total }) : ''}
          {unresolved > 0 ? ` · ${t('CONFIG_REFERENCE_TOTAL_PARTIAL', { count: unresolved })}` : ''}
        </span>
        <span style={{ flex: 1 }} />
        <span
          role="button"
          tabIndex={0}
          aria-expanded={allExpanded}
          style={summaryHeaderToggleStyle}
          onClick={toggleAll}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') toggleAll();
          }}
        >
          {allExpanded ? t('CONFIG_REFERENCE_COLLAPSE_ALL') : t('CONFIG_REFERENCE_EXPAND_ALL')}
        </span>
      </div>
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
            showValues
            expanded={!!expandedRows[index]}
            onExpandedChange={next => setExpandedRows(current => ({ ...current, [index]: next }))}
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
  alignItems: 'center',
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
