import React, { useEffect, useMemo, useState } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { configMapStore, request, secretStore, workloadStore } from '@ks-console/shared';

import { getConfigReferenceSummaryPrefix, getConfigReferenceSummaryRows } from './summary';
import { getContainerEnvFrom, getContainerNames } from './workload';
import ConfigReferencePreview from './ConfigReferencePreview';
import { previewReferences } from './preview';
import type { EnvFromReference, ResourceKeys } from './preview';

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

  const keyOf = (reference: EnvFromReference) => `${reference.kind}:${reference.name}`;
  const wanted = references.map(keyOf).join(',');
  const [resourceKeys, setResourceKeys] = useState<Record<string, ResourceKeys>>({});

  useEffect(() => {
    if (!wanted) {
      return undefined;
    }
    let active = true;
    const targets = wanted.split(',').filter(Boolean);
    Promise.all(
      targets.map(async token => {
        const [kind, ...rest] = token.split(':');
        const resourceName = rest.join(':');
        try {
          if (kind === 'secret') {
            // Raw request: the shared Secret mapper base64-decodes every value and
            // only the key names are wanted. Values transit the wire (Kubernetes
            // has no keys-only API) but are never decoded, stored or rendered.
            const url = secretStore.getDetailUrl({
              cluster,
              namespace,
              name: resourceName,
            });
            const raw: any = await request.get(url);
            return {
              token,
              keys: { data: Object.keys(raw?.data || {}), binaryData: [] } as ResourceKeys,
            };
          }
          const detail: any = await configMapStore.fetchDetail({
            cluster,
            namespace,
            name: resourceName,
          });
          return {
            token,
            keys: {
              data: Object.keys(detail?.data || {}),
              binaryData: Object.keys(detail?.binaryData || {}),
            } as ResourceKeys,
          };
        } catch {
          return null;
        }
      }),
    ).then(results => {
      if (!active) {
        return;
      }
      const next: Record<string, ResourceKeys> = {};
      results.forEach(item => {
        if (item) next[item.token] = item.keys;
      });
      setResourceKeys(next);
    });
    return () => {
      active = false;
    };
  }, [wanted, cluster, namespace]);

  const previews = useMemo(
    // No manualEnvNames here: this variant is read-only and the V3 rows it would
    // read belong to the editor dialog.
    // Keys that are still loading resolve to undefined -> `resolved: false`, so a
    // pending fetch renders nothing instead of a false "no effective keys".
    () =>
      previewReferences(
        references as EnvFromReference[],
        reference => resourceKeys[keyOf(reference)],
      ),
    [references, resourceKeys],
  );

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
            kind={(reference as EnvFromReference).kind}
            identity={`${reference.kind}:${reference.name}:${
              (reference as EnvFromReference).prefix || ''
            }`}
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
