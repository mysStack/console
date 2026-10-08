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
import { useReferencePreviews } from './useReferencePreviews';
import { readFileMounts, validateFileMounts } from './fileMount';
import type { FileMountReference } from './fileMount';
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
  previewNoteStyle,
  previewProblemStyle,
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
  const [fileMounts, setFileMounts] = useState<FileMountReference[]>([]);
  const [reloaderEnabled, setReloaderEnabled] = useState(false);
  const [saveError, setSaveError] = useState<{ index: number; message: string } | null>(null);
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
    // Seed the file-mount rows from what the container already has: planFileMounts
    // treats them as the complete desired set for the container, so an unseeded
    // (empty) list would delete its existing mounts and their volumes on save.
    setFileMounts(
      detailQuery.data ? readFileMounts(detailQuery.data as any, selectedContainer) : [],
    );
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

  // Keys, values and the resulting per-row preview all come from the shared hook,
  // the same one the panel and the summary use.
  const previews = useReferencePreviews(references, cluster, namespace, { manualEnvNames });
  // Same hook as envFrom: file mounts need the resource's key list too. Memoized
  // because the hook keys its fetch effect off this array's identity.
  const fileMountReferences = useMemo(
    () => fileMounts.map(mount => ({ kind: mount.kind, name: mount.name, prefix: '' })),
    [fileMounts],
  );
  const fileMountPreviews = useReferencePreviews(fileMountReferences, cluster, namespace);

  const saveMutation = useMutation(
    (data: Record<string, any>) =>
      request.patch(store.getDetailUrl({ cluster, namespace, name }), data, {
        headers: { 'content-type': 'application/json-patch+json' },
      }),
    {
      onSuccess: () => {
        setSaveError(null);
        notify.success(t('CONFIG_REFERENCE_SAVE_SUCCESS'));
        onSaved?.();
        onClose();
      },
      onError: (error: any) => {
        // The API answers with e.g.
        //   ... envFrom[0].prefix: Invalid value: "1BAD": a valid environment
        //   variable name must consist of ...
        // so the failing row can be pointed at instead of a bare toast.
        const message =
          error?.response?.data?.message || error?.response?.data?.error || error?.message || '';
        const matched = /envFrom\[(\d+)\]/.exec(String(message));
        setSaveError({
          index: matched ? Number(matched[1]) : -1,
          message: String(message).slice(0, 300) || t('CONFIG_REFERENCE_SAVE_FAILED'),
        });
        notify.error(t('CONFIG_REFERENCE_SAVE_FAILED'));
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

  const fileMountProblems = validateFileMounts(fileMounts);
  const updateFileMount = (index: number, value: Partial<FileMountReference>) =>
    setFileMounts(current =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
  const updateReference = (index: number, value: Partial<EnvFromReference>) =>
    setReferences(current =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
  const save = () => {
    setSaveError(null);
    if (duplicateIndexes.length) return notify.error(t('CONFIG_REFERENCE_DUPLICATE'));
    if (references.some(reference => !reference.name.trim())) {
      return notify.error(t('CONFIG_REFERENCE_NAME_REQUIRED'));
    }
    if (unavailableIndexes.length) return notify.error(t('CONFIG_REFERENCE_UNAVAILABLE'));
    if (fileMountProblems.length) {
      return notify.error(t(`CONFIG_REFERENCE_FILE_MOUNT_${fileMountProblems[0].code}`));
    }
    saveMutation.mutate(
      buildConfigReferencePatch(
        detailQuery.data as any,
        selectedContainer,
        references,
        reloaderEnabled,
        fileMounts,
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
          <button
            type="button"
            style={iconButtonStyle}
            aria-label={t('CONFIG_REFERENCE_ARIA_CLOSE')}
            onClick={onClose}
          >
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
                  aria-label={t('CONFIG_REFERENCE_ARIA_KIND', { index: index + 1 })}
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
                  aria-label={t('CONFIG_REFERENCE_ARIA_RESOURCE', { index: index + 1 })}
                  value={reference.name}
                  options={resourceOptions}
                  disabled={resourceLoading}
                  onValueChange={value => updateReference(index, { name: value })}
                />
                <input
                  aria-label={t('CONFIG_REFERENCE_ARIA_PREFIX', { index: index + 1 })}
                  style={controlStyle}
                  value={reference.prefix || ''}
                  placeholder={t('CONFIG_REFERENCE_PREFIX_PLACEHOLDER')}
                  onChange={event => updateReference(index, { prefix: event.target.value })}
                />
                <Button
                  type="button"
                  className="button-flat button-size-normal has-icon"
                  aria-label={t('CONFIG_REFERENCE_ARIA_REMOVE', { index: index + 1 })}
                  onClick={() =>
                    setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Icon name="trash" />
                </Button>
              </div>
              <ConfigReferencePreview
                kind={reference.kind}
                identity={`${reference.kind}:${reference.name}:${reference.prefix || ''}`}
                preview={previews[index]}
                error={
                  duplicate
                    ? t('CONFIG_REFERENCE_DUPLICATE')
                    : unavailable
                      ? t('CONFIG_REFERENCE_UNAVAILABLE')
                      : saveError && saveError.index === index
                        ? saveError.message
                        : undefined
                }
              />
            </div>
          );
        })}
      </div>

      <div style={{ ...referenceToolbarStyle, marginTop: 18 }}>
        <div style={referenceToolbarHintStyle}>
          <strong>{t('CONFIG_REFERENCE_FILE_MOUNTS')}</strong>
        </div>
        <div style={referenceToolbarActionsStyle}>
          <button
            type="button"
            className="button button-default button-size-normal"
            style={buttonStyle}
            disabled={resourceLoading}
            onClick={() =>
              setFileMounts(current => [
                ...current,
                { kind: 'configMap', name: '', mountPath: '', readOnly: true },
              ])
            }
          >
            {t('CONFIG_REFERENCE_FILE_MOUNT_ADD')}
          </button>
        </div>
      </div>
      {fileMounts.length === 0 && <div style={messageStyle}>{t('CONFIG_REFERENCE_EMPTY')}</div>}
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {fileMounts.map((mount, index) => {
          const options = mount.kind === 'secret' ? secrets : configMaps;
          // Only complain once a resource is chosen: an empty new row is not an error,
          // and the mount path is meaningless until then.
          const problem = mount.name
            ? fileMountProblems.find(item => item.index === index)
            : undefined;
          const preview = fileMountPreviews[index];
          const resourceOptions = [
            ...(mount.name && !options.some(option => option.value === mount.name)
              ? [{ label: `${mount.name}（不可用）`, value: mount.name, disabled: true }]
              : []),
            emptyOption,
            ...options,
          ];
          return (
            <div key={`mount-${index}-${mount.kind}`}>
              <div style={referenceRowStyle}>
                <NativeSelect
                  aria-label={t('CONFIG_REFERENCE_ARIA_KIND', { index: index + 1 })}
                  value={mount.kind}
                  options={[
                    { label: '来自配置字典', value: 'configMap' },
                    { label: '来自保密字典', value: 'secret' },
                  ]}
                  onValueChange={value =>
                    updateFileMount(index, { kind: value as ConfigReferenceKind, name: '' })
                  }
                />
                <NativeSelect
                  aria-label={t('CONFIG_REFERENCE_ARIA_RESOURCE', { index: index + 1 })}
                  value={mount.name}
                  options={resourceOptions}
                  disabled={resourceLoading}
                  onValueChange={value => updateFileMount(index, { name: value })}
                />
                <input
                  aria-label={t('CONFIG_REFERENCE_FILE_MOUNT_PATH')}
                  style={controlStyle}
                  value={mount.mountPath}
                  placeholder="/etc/app/config"
                  onChange={event => updateFileMount(index, { mountPath: event.target.value })}
                />
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  <input
                    type="checkbox"
                    checked={mount.readOnly}
                    onChange={event => updateFileMount(index, { readOnly: event.target.checked })}
                  />
                  {t('CONFIG_REFERENCE_FILE_MOUNT_READ_ONLY')}
                </label>
                <Button
                  type="button"
                  className="button-flat button-size-normal has-icon"
                  aria-label={t('CONFIG_REFERENCE_ARIA_REMOVE', { index: index + 1 })}
                  onClick={() =>
                    setFileMounts(current => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Icon name="trash" />
                </Button>
              </div>
              {problem && (
                <div role="alert" style={previewProblemStyle}>
                  {t(`CONFIG_REFERENCE_FILE_MOUNT_${problem.code}`)}
                </div>
              )}
              {!problem && preview && preview.resolved && preview.entries.length > 0 && (
                <div style={previewNoteStyle}>
                  {t('CONFIG_REFERENCE_FILE_MOUNT_PREVIEW', { count: preview.entries.length })}
                </div>
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
