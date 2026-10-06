import React, { useEffect, useMemo, useState } from 'react';
/* eslint-disable @typescript-eslint/no-use-before-define */
import { useMutation } from 'react-query';
import { configMapStore, Icon, request, secretStore, workloadStore } from '@ks-console/shared';
import { Button, notify } from '@kubed/components';

import { findDuplicateReferences, parseEnvFrom } from './envFrom';
import { readReloaderPolicy } from './reloader';
import { buildConfigReferencePatch, getContainerEnvFrom, getContainerNames } from './workload';
import type { ConfigReferenceKind, EnvFromReference } from './types';
import { toNameOptions } from './resourceOptions';
import ConfigReferencePreview from './ConfigReferencePreview';
import { PREVIEW_SECRET_KEYS, previewReferences } from './preview';
import type { ResourceKeys } from './preview';
import {
  autoReloadStyle,
  buttonStyle,
  colors,
  controlStyle,
  footerStyle,
  iconButtonStyle,
  linkButtonStyle,
  messageStyle,
  nativeSelectArrowStyle,
  nativeSelectStyle,
  nativeSelectWrapperStyle,
  primaryButtonStyle,
  referenceRowStyle,
  referenceToolbarActionsStyle,
  referenceToolbarHintStyle,
  referenceToolbarStyle,
  reloaderKnobEnabledStyle,
  reloaderKnobStyle,
  reloaderSwitchEnabledStyle,
  reloaderSwitchStyle,
  sectionStyle,
} from './styles';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';
type NameOption = { label: string; value: string; disabled?: boolean };

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  workloadKind: string;
  containerName?: string;
  /** Names typed into the V3 environment rows, including unsaved edits. */
  manualEnvNames?: string[];
  onClose: () => void;
  onSaved?: () => void;
}

const storeByModule = {
  deployments: workloadStore('deployments'),
  statefulsets: workloadStore('statefulsets'),
  daemonsets: workloadStore('daemonsets'),
} as const;

const emptyOption: NameOption = { label: '请选择', value: '' };

function NativeSelect({
  options,
  onValueChange,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  options: NameOption[];
  onValueChange?: (value: string) => void;
}) {
  return (
    <div style={nativeSelectWrapperStyle}>
      <select
        {...props}
        style={nativeSelectStyle}
        onChange={event => onValueChange?.(event.target.value)}
      >
        {options.map(option => (
          <option
            key={`${option.value}-${option.label}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" style={nativeSelectArrowStyle}>
        ▾
      </span>
    </div>
  );
}

export default function ConfigReferenceInline({
  cluster,
  namespace,
  name,
  module,
  workloadKind,
  containerName: targetContainerName,
  manualEnvNames = [],
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
  const [resourceKeys, setResourceKeys] = useState<
    Record<ConfigReferenceKind, Record<string, ResourceKeys>>
  >({ configMap: {}, secret: {} });

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
        setConfigMaps(toNameOptions(maps));
        setSecrets(toNameOptions(names));
      })
      .catch(() => active && setResourceError(true))
      .finally(() => active && setResourceLoading(false));
    return () => {
      active = false;
    };
  }, [cluster, namespace, reloadKey]);

  const referencedResources = useMemo(() => {
    const unique = new Map<string, { kind: ConfigReferenceKind; name: string }>();
    references.forEach(reference => {
      if (reference.name) {
        unique.set(`${reference.kind}:${reference.name}`, {
          kind: reference.kind,
          name: reference.name,
        });
      }
    });
    return Array.from(unique.values());
  }, [references]);

  // Fetch keys one referenced resource at a time. A namespace-wide list would
  // also work but transfers every ConfigMap/Secret in the project.
  useEffect(() => {
    let active = true;
    const missing = referencedResources.filter(
      resource => !(resource.name in (resourceKeys[resource.kind] || {})),
    );
    if (!missing.length) {
      return undefined;
    }

    Promise.all(
      missing.map(async resource => {
        // Secret objects are never fetched while the preview is disabled, which
        // keeps "只保存资源名称和前缀，不读取或展示 Secret 内容" literally true.
        if (resource.kind === 'secret' && !PREVIEW_SECRET_KEYS) {
          return null;
        }
        const resourceStore = resource.kind === 'secret' ? secretStore : configMapStore;
        try {
          const detail: any = await resourceStore.fetchDetail({
            cluster,
            namespace,
            name: resource.name,
          });
          return {
            kind: resource.kind,
            name: resource.name,
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
      const fresh = results.filter(Boolean) as Array<{
        kind: ConfigReferenceKind;
        name: string;
        keys: ResourceKeys;
      }>;
      if (!fresh.length) {
        return;
      }
      setResourceKeys(previous => {
        const next = { configMap: { ...previous.configMap }, secret: { ...previous.secret } };
        fresh.forEach(item => {
          next[item.kind][item.name] = item.keys;
        });
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [referencedResources, resourceKeys, cluster, namespace]);

  const previews = useMemo(
    () =>
      previewReferences(
        references,
        reference => (resourceKeys[reference.kind] || {})[reference.name],
        { manualEnvNames },
      ),
    [references, resourceKeys, manualEnvNames],
  );

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
      <div style={referenceToolbarStyle}>
        <div style={referenceToolbarHintStyle}>{t('CONFIG_REFERENCE_SECRET_NOTICE')}</div>
        <div style={referenceToolbarActionsStyle}>
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
          <button type="button" style={iconButtonStyle} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
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
            <div key={`${index}-${reference.kind}`}>
              <div style={referenceRowStyle}>
                <NativeSelect
                  aria-label={`引用类型 ${index + 1}`}
                  value={reference.kind}
                  options={[
                    { label: '来自配置字典', value: 'configMap' },
                    { label: '来自保密字典', value: 'secret' },
                  ]}
                  onValueChange={value =>
                    updateReference(index, {
                      kind: value as ConfigReferenceKind,
                      name: '',
                    })
                  }
                />
                <NativeSelect
                  aria-label={`引用资源 ${index + 1}`}
                  value={reference.name}
                  options={resourceOptions}
                  disabled={resourceLoading}
                  onValueChange={value => updateReference(index, { name: value })}
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
              </div>
              <ConfigReferencePreview
                kind={reference.kind}
                preview={previews[index]}
                error={
                  duplicate
                    ? t('CONFIG_REFERENCE_DUPLICATE')
                    : unavailable
                      ? t('CONFIG_REFERENCE_UNAVAILABLE')
                      : undefined
                }
              />
            </div>
          );
        })}
      </div>

      <div style={autoReloadStyle}>
        <div>
          <strong style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
            {t('CONFIG_REFERENCE_AUTO_RELOAD')}
          </strong>
          <div style={{ marginTop: 4, color: colors.textMuted, fontSize: 12, lineHeight: 1.4 }}>
            {t('CONFIG_REFERENCE_AUTO_RELOAD_DESC')}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reloaderEnabled}
          aria-label={t('CONFIG_REFERENCE_AUTO_RELOAD')}
          onClick={() => setReloaderEnabled(value => !value)}
          style={{ ...reloaderSwitchStyle, ...(reloaderEnabled ? reloaderSwitchEnabledStyle : {}) }}
        >
          <span>
            {t(reloaderEnabled ? 'CONFIG_REFERENCE_ENABLED' : 'CONFIG_REFERENCE_DISABLED')}
          </span>
          <span
            style={{ ...reloaderKnobStyle, ...(reloaderEnabled ? reloaderKnobEnabledStyle : {}) }}
          />
        </button>
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
          style={primaryButtonStyle}
          disabled={saveMutation.isLoading || resourceLoading}
          onClick={save}
        >
          {saveMutation.isLoading ? 'Saving…' : t('CONFIG_REFERENCE_SAVE')}
        </button>
      </div>
    </section>
  );
}
