import React, { useEffect, useMemo, useState } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { useMutation } from 'react-query';
import { configMapStore, Icon, request, secretStore, workloadStore } from '@ks-console/shared';
import { Button, Select, Switch, notify } from '@kubed/components';

import { findDuplicateReferences, parseEnvFrom } from './envFrom';
import { readReloaderPolicy } from './reloader';
import { buildConfigReferencePatch, getContainerEnvFrom, getContainerNames } from './workload';
import type { ConfigReferenceKind, EnvFromReference } from './types';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';
type NameOption = { label: string; value: string; disabled?: boolean };

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  workloadKind: string;
  containerName?: string;
  onClose: () => void;
  onSaved?: () => void;
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

const emptyOption: NameOption = { label: '请选择', value: '' };

const controlStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minHeight: 32,
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #b8c4d4',
  borderRadius: 4,
  background: '#fff',
  color: '#27364b',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
};

// Select owns its border, arrow and popup styling. Keep only the sizing here so
// the V3 dark dropdown is not replaced by a second custom border.
const selectStyle: React.CSSProperties = {
  width: '100%',
};

const buttonStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '0 14px',
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
  containerName: targetContainerName,
  onClose,
  onSaved,
}: Props) {
  const store = storeByModule[module];
  const detailQuery = store.useGetDetail({ cluster, namespace, name });
  const [configMaps, setConfigMaps] = useState<NameOption[]>([]);
  const [secrets, setSecrets] = useState<NameOption[]>([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [references, setReferences] = useState<EnvFromReference[]>([]);
  const [reloaderEnabled, setReloaderEnabled] = useState(false);

  const containers = useMemo(
    () => (detailQuery.data ? getContainerNames(detailQuery.data as any) : []),
    [detailQuery.data],
  );
  const selectedContainer =
    targetContainerName && containers.includes(targetContainerName)
      ? targetContainerName
      : containers[0] || '';

  useEffect(() => {
    if (!detailQuery.data) return;
    setReferences(parseEnvFrom(getContainerEnvFrom(detailQuery.data as any, selectedContainer)));
    const original = (detailQuery.data as any)._originData || detailQuery.data;
    setReloaderEnabled(
      readReloaderPolicy(original?.metadata?.annotations || (detailQuery.data as any).annotations)
        .enabled,
    );
  }, [detailQuery.data, selectedContainer]);

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
        onSaved?.();
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

  const duplicateIndexes = findDuplicateReferences(references);
  const availableNames = {
    configMap: new Set(configMaps.map(option => option.value)),
    secret: new Set(secrets.map(option => option.value)),
  };
  const unavailableIndexes = references.reduce<number[]>((indexes, reference, index) => {
    if (reference.name && !availableNames[reference.kind].has(reference.name)) indexes.push(index);
    return indexes;
  }, []);

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
          <strong style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 600 }}>
            {t('CONFIG_REFERENCE')}
          </strong>
          <div style={{ marginTop: 4, color: '#7b8ba4', fontSize: 12, lineHeight: 1.4 }}>
            {t('CONFIG_REFERENCE_SECRET_NOTICE')}
          </div>
        </div>
        <button type="button" style={iconButtonStyle} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div style={{ ...headerStyle, marginTop: 12 }}>
        <div>
          <strong style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
            {t('CONFIG_REFERENCE_RESOURCES')}
          </strong>
          <div style={{ marginTop: 4, color: '#7b8ba4', fontSize: 12, lineHeight: 1.4 }}>
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
          const resourceOptions = [
            ...(unavailable
              ? [{ label: `${reference.name}（不可用）`, value: reference.name, disabled: true }]
              : []),
            emptyOption,
            ...options,
          ];
          return (
            <div key={`${index}-${reference.kind}`} style={referenceRowStyle}>
              <Select
                aria-label={`引用类型 ${index + 1}`}
                style={selectStyle}
                value={reference.kind}
                options={[
                  { label: '来自配置字典', value: 'configMap' },
                  { label: '来自保密字典', value: 'secret' },
                ]}
                onChange={value =>
                  updateReference(index, {
                    kind: value as ConfigReferenceKind,
                    name: '',
                  })
                }
              />
              <Select
                aria-label={`引用资源 ${index + 1}`}
                style={selectStyle}
                value={reference.name}
                options={resourceOptions}
                disabled={resourceLoading}
                loading={resourceLoading}
                onChange={value => updateReference(index, { name: String(value || '') })}
              />
              <input
                aria-label={`前缀 ${index + 1}`}
                style={controlStyle}
                value={reference.prefix || ''}
                placeholder={t('CONFIG_REFERENCE_PREFIX_PLACEHOLDER')}
                onChange={event => updateReference(index, { prefix: event.target.value })}
              />
              <Button
                type="button"
                className="button-flat button-size-normal has-icon"
                aria-label={`删除引用 ${index + 1}`}
                onClick={() =>
                  setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Icon name="trash" />
              </Button>
              {(duplicate || unavailable) && (
                <span role="alert" style={{ color: '#d03050', gridColumn: '1 / -1', fontSize: 12 }}>
                  {duplicate ? t('CONFIG_REFERENCE_DUPLICATE') : t('CONFIG_REFERENCE_UNAVAILABLE')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={autoReloadStyle}>
        <div>
          <strong style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
            {t('CONFIG_REFERENCE_AUTO_RELOAD')}
          </strong>
          <div style={{ marginTop: 4, color: '#7b8ba4', fontSize: 12, lineHeight: 1.4 }}>
            {t('CONFIG_REFERENCE_AUTO_RELOAD_DESC')}
          </div>
        </div>
        <Switch
          variant="button"
          label={t(reloaderEnabled ? 'CONFIG_REFERENCE_ENABLED' : 'CONFIG_REFERENCE_DISABLED')}
          checked={reloaderEnabled}
          onChange={checked => setReloaderEnabled(checked)}
        />
      </div>

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
  padding: '12px 14px 10px',
  border: '1px solid #c8d5e4',
  borderRadius: 9,
  background: '#f7f9fc',
  color: '#27364b',
  textAlign: 'left',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const referenceRowStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'grid',
  // Match the V3 environment-variable row measured in the live 131 console:
  // 831px row width, 46px row height, 32px controls, 58px delete action.
  gridTemplateColumns: '130px minmax(180px, 1fr) minmax(130px, 1fr) 58px',
  gap: 8,
  alignItems: 'center',
  padding: '6px 10px',
  minHeight: 46,
  border: '1px solid #c8d3e1',
  borderRadius: 100,
  background: '#eff4f9',
};

const messageStyle: React.CSSProperties = {
  padding: '16px 0 2px',
  color: '#7b8ba4',
  fontSize: 13,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 12,
  paddingTop: 10,
  borderTop: '1px solid #cad5e3',
};

const autoReloadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 18,
  paddingTop: 14,
  borderTop: '1px solid #cad5e3',
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
