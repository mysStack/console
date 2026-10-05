import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { configMapStore, request, secretStore, workloadStore } from '@ks-console/shared';
import { notify } from '@kubed/components';

import { findDuplicateReferences, parseEnvFrom } from './envFrom';
import { readReloaderPolicy } from './reloader';
import { buildConfigReferencePatch, getContainerEnvFrom, getContainerNames } from './workload';
import type { ConfigReferenceKind, EnvFromReference } from './types';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';
type NameOption = { label: string; value: string };

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  workloadKind: string;
  onClose: () => void;
}

const storeByModule = {
  deployments: workloadStore('deployments'),
  statefulsets: workloadStore('statefulsets'),
  daemonsets: workloadStore('daemonsets'),
} as const;

const toNameOptions = (items: any[]): NameOption[] =>
  items
    .map(item => (typeof item === 'string' ? item : item?.name || item?.metadata?.name))
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .map(name => ({ label: name, value: name }));

const controlStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minHeight: 36,
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #b8c4d4',
  borderRadius: 4,
  background: '#fff',
  color: '#27364b',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '5px 23px',
  border: '1px solid #ccd3db',
  borderRadius: 100,
  background: '#eff4f9',
  color: '#36435c',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

export default function ConfigReferenceInline({
  cluster,
  namespace,
  name,
  module,
  workloadKind,
  onClose,
}: Props) {
  const store = storeByModule[module];
  const detailQuery = store.useGetDetail({ cluster, namespace, name });
  const [configMaps, setConfigMaps] = useState<NameOption[]>([]);
  const [secrets, setSecrets] = useState<NameOption[]>([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [containerName, setContainerName] = useState('');
  const [references, setReferences] = useState<EnvFromReference[]>([]);
  const [reloaderEnabled, setReloaderEnabled] = useState(false);

  const containers = useMemo(
    () => (detailQuery.data ? getContainerNames(detailQuery.data as any) : []),
    [detailQuery.data],
  );

  useEffect(() => {
    if (!detailQuery.data) return;
    const nextContainer = containers[0] || '';
    setContainerName(nextContainer);
    setReferences(parseEnvFrom(getContainerEnvFrom(detailQuery.data as any, nextContainer)));
    const original = (detailQuery.data as any)._originData || detailQuery.data;
    setReloaderEnabled(
      readReloaderPolicy(original?.metadata?.annotations || (detailQuery.data as any).annotations)
        .enabled,
    );
  }, [containers, detailQuery.data]);

  useEffect(() => {
    let active = true;
    setResourceLoading(true);
    setResourceError(false);
    Promise.all([
      configMapStore.fetchNameListByK8s({ cluster, namespace }),
      secretStore.fetchNameListByK8s({ cluster, namespace }),
    ])
      .then(([maps, names]) => {
        if (!active) return;
        setConfigMaps(toNameOptions(Array.isArray(maps) ? maps : []));
        setSecrets(toNameOptions(Array.isArray(names) ? names : []));
      })
      .catch(() => active && setResourceError(true))
      .finally(() => active && setResourceLoading(false));
    return () => {
      active = false;
    };
  }, [cluster, namespace, reloadKey]);

  const saveMutation = useMutation(
    (data: Record<string, any>) =>
      request.patch(store.getDetailUrl({ cluster, namespace, name }), data, {
        headers: { 'content-type': 'application/json-patch+json' },
      }),
    {
      onSuccess: () => {
        notify.success(t('CONFIG_REFERENCE_SAVE_SUCCESS'));
        onClose();
      },
    },
  );

  if (detailQuery.isLoading) {
    return (
      <div data-test="config-reference-inline" style={sectionStyle}>
        {t('CONFIG_REFERENCE_LOADING')}
      </div>
    );
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div data-test="config-reference-inline" role="alert" style={sectionStyle}>
        {t('CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR')}
      </div>
    );
  }
  if (!containers.length) {
    return (
      <div data-test="config-reference-inline" role="alert" style={sectionStyle}>
        {t('CONFIG_REFERENCE_NO_CONTAINERS', { kind: workloadKind })}
      </div>
    );
  }

  const selectedContainer = containerName || containers[0];
  const duplicateIndexes = findDuplicateReferences(references);
  const availableNames = {
    configMap: new Set(configMaps.map(option => option.value)),
    secret: new Set(secrets.map(option => option.value)),
  };
  const unavailableIndexes = references.reduce<number[]>((indexes, reference, index) => {
    if (reference.name && !availableNames[reference.kind].has(reference.name)) indexes.push(index);
    return indexes;
  }, []);

  const updateContainer = (nextName: string) => {
    setContainerName(nextName);
    setReferences(parseEnvFrom(getContainerEnvFrom(detailQuery.data as any, nextName)));
  };
  const updateReference = (index: number, value: Partial<EnvFromReference>) =>
    setReferences(current =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
  const save = () => {
    if (duplicateIndexes.length) return notify.error(t('CONFIG_REFERENCE_DUPLICATE'));
    if (references.some(reference => !reference.name.trim())) {
      return notify.error(t('CONFIG_REFERENCE_NAME_REQUIRED'));
    }
    if (unavailableIndexes.length) return notify.error(t('CONFIG_REFERENCE_UNAVAILABLE'));
    saveMutation.mutate(
      buildConfigReferencePatch(
        detailQuery.data as any,
        selectedContainer,
        references,
        reloaderEnabled,
      ),
    );
  };

  return (
    <section data-test="config-reference-inline" style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <strong style={{ fontSize: 16 }}>{t('CONFIG_REFERENCE')}</strong>
          <div style={{ marginTop: 4, color: '#79879c', fontSize: 12 }}>
            {t('CONFIG_REFERENCE_SECRET_NOTICE')}
          </div>
        </div>
        <button type="button" style={iconButtonStyle} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <label style={labelStyle}>
        {t('CONFIG_REFERENCE_CONTAINER')}
        <select
          aria-label="配置引用容器"
          style={controlStyle}
          value={selectedContainer}
          onChange={event => updateContainer(event.target.value)}
        >
          {containers.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div style={{ ...headerStyle, marginTop: 14 }}>
        <div>
          <strong>{t('CONFIG_REFERENCE_RESOURCES')}</strong>
          <div style={{ marginTop: 4, color: '#79879c', fontSize: 12 }}>
            {t('CONFIG_REFERENCE_SECRET_NOTICE')}
          </div>
        </div>
        <button
          type="button"
          className="button button-default button-size-normal"
          style={buttonStyle}
          disabled={resourceLoading}
          onClick={() =>
            setReferences(current => [...current, { kind: 'configMap', name: '', prefix: '' }])
          }
        >
          {t('CONFIG_REFERENCE_ADD')}
        </button>
      </div>

      {resourceLoading && <div style={messageStyle}>{t('CONFIG_REFERENCE_LOADING')}</div>}
      {resourceError && (
        <div role="alert" style={messageStyle}>
          <span>{t('CONFIG_REFERENCE_LOAD_ERROR')}</span>{' '}
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => setReloadKey(value => value + 1)}
          >
            {t('CONFIG_REFERENCE_RETRY')}
          </button>
        </div>
      )}
      {!resourceLoading && !resourceError && references.length === 0 && (
        <div style={messageStyle}>{t('CONFIG_REFERENCE_EMPTY')}</div>
      )}

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {references.map((reference, index) => {
          const options = reference.kind === 'secret' ? secrets : configMaps;
          const duplicate = duplicateIndexes.includes(index);
          const unavailable = unavailableIndexes.includes(index);
          return (
            <div key={`${index}-${reference.kind}`} style={referenceRowStyle}>
              <select
                aria-label={`引用类型 ${index + 1}`}
                style={controlStyle}
                value={reference.kind}
                onChange={event =>
                  updateReference(index, {
                    kind: event.target.value as ConfigReferenceKind,
                    name: '',
                  })
                }
              >
                <option value="configMap">ConfigMap</option>
                <option value="secret">Secret</option>
              </select>
              <select
                aria-label={`引用资源 ${index + 1}`}
                style={controlStyle}
                value={reference.name}
                disabled={resourceLoading}
                onChange={event => updateReference(index, { name: event.target.value })}
              >
                <option value="">Select</option>
                {unavailable && (
                  <option value={reference.name}>{reference.name} (unavailable)</option>
                )}
                {options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`前缀 ${index + 1}`}
                style={controlStyle}
                value={reference.prefix || ''}
                placeholder={t('CONFIG_REFERENCE_PREFIX_PLACEHOLDER')}
                onChange={event => updateReference(index, { prefix: event.target.value })}
              />
              <button
                type="button"
                className="button button-default button-size-normal"
                style={buttonStyle}
                onClick={() =>
                  setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Delete
              </button>
              {(duplicate || unavailable) && (
                <span role="alert" style={{ color: '#d03050', gridColumn: '1 / -1', fontSize: 12 }}>
                  {duplicate ? t('CONFIG_REFERENCE_DUPLICATE') : t('CONFIG_REFERENCE_UNAVAILABLE')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <label style={{ ...headerStyle, marginTop: 14, cursor: 'pointer' }}>
        <span>
          <strong>{t('CONFIG_REFERENCE_AUTO_RELOAD')}</strong>
          <div style={{ marginTop: 4, color: '#79879c', fontSize: 12 }}>
            {t('CONFIG_REFERENCE_AUTO_RELOAD_DESC')}
          </div>
        </span>
        <input
          type="checkbox"
          checked={reloaderEnabled}
          onChange={event => setReloaderEnabled(event.target.checked)}
        />
      </label>

      <div style={footerStyle}>
        <button
          type="button"
          className="button button-default button-size-normal"
          style={buttonStyle}
          onClick={onClose}
        >
          {t('CONFIG_REFERENCE_CANCEL')}
        </button>
        <button
          type="button"
          className="button button-control button-size-normal"
          style={{ ...buttonStyle, background: '#242e42', borderColor: '#242e42', color: '#fff' }}
          disabled={saveMutation.isLoading || resourceLoading}
          onClick={save}
        >
          {saveMutation.isLoading ? 'Saving…' : t('CONFIG_REFERENCE_SAVE')}
        </button>
      </div>
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  border: '1px solid #c8d3e1',
  borderRadius: 6,
  background: '#f6f8fb',
  color: '#27364b',
  textAlign: 'left',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 14,
  fontSize: 13,
  fontWeight: 600,
};

const referenceRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '130px minmax(180px, 1fr) minmax(130px, 1fr) auto',
  gap: 8,
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #c8d3e1',
  borderRadius: 100,
  background: '#eff4f9',
};

const messageStyle: React.CSSProperties = {
  padding: '12px 0 4px',
  color: '#79879c',
  fontSize: 13,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
  paddingTop: 12,
  borderTop: '1px solid #d8e0eb',
};

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '1px solid #ccd3db',
  borderRadius: 100,
  background: '#eff4f9',
  color: '#53657d',
  fontFamily: 'inherit',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  border: 0,
  padding: 0,
  background: 'transparent',
  color: '#3182ce',
  cursor: 'pointer',
};
