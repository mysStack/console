import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { Button, Card, Input, Loading, Select, Switch, notify } from '@kubed/components';
import { configMapStore, request, secretStore, workloadStore } from '@ks-console/shared';

import { findDuplicateReferences, parseEnvFrom } from './envFrom';
import { readReloaderPolicy } from './reloader';
import { buildConfigReferencePatch, getContainerEnvFrom, getContainerNames } from './workload';
import type { ConfigReferenceKind, EnvFromReference } from './types';
import { colors, columns } from './styles';
import ConfigReferencePreview from './ConfigReferencePreview';
import { useReferencePreviews } from './useReferencePreviews';

type WorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

interface Props {
  cluster: string;
  namespace: string;
  name: string;
  module: WorkloadModule;
  workloadKind: string;
  onBack: () => void;
}

type NameOption = { label: string; value: string };

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

const emptyOption = { label: '请选择', value: '' };

export default function ConfigReferencePanel({
  cluster,
  namespace,
  name,
  module,
  workloadKind,
  onBack,
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
  const [saveError, setSaveError] = useState<{ index: number; message: string } | null>(null);

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

  const updateContainer = (nextName: string) => {
    setContainerName(nextName);
    setReferences(parseEnvFrom(getContainerEnvFrom(detailQuery.data as any, nextName)));
  };

  const saveMutation = useMutation(
    (data: Record<string, any>) =>
      request.patch(store.getDetailUrl({ cluster, namespace, name }), data, {
        headers: { 'content-type': 'application/json-patch+json' },
      }),
    {
      onSuccess: () => {
        setSaveError(null);
        notify.success(t('CONFIG_REFERENCE_SAVE_SUCCESS'));
        detailQuery.refetch();
      },
      onError: (error: any) => {
        // Same handling as the inline editor: the API answers with e.g.
        //   ... envFrom[0].prefix: Invalid value: "1BAD": ...
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

  // Must sit above the early returns below: hooks run in a fixed order.
  const previews = useReferencePreviews(references, cluster, namespace);

  if (detailQuery.isLoading) return <Loading className="page-loading" />;
  if (detailQuery.isError || !detailQuery.data) {
    return <div role="alert">{t('CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR')}</div>;
  }
  if (!containers.length) {
    return <div role="alert">{t('CONFIG_REFERENCE_NO_CONTAINERS', { kind: workloadKind })}</div>;
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
  const names = containerName === '' ? containers[0] : containerName;
  const addReference = () =>
    setReferences(current => [...current, { kind: 'configMap', name: '', prefix: '' }]);

  const save = () => {
    setSaveError(null);
    if (duplicateIndexes.length) {
      notify.error(t('CONFIG_REFERENCE_DUPLICATE'));
      return;
    }
    if (references.some(reference => !reference.name.trim())) {
      notify.error(t('CONFIG_REFERENCE_NAME_REQUIRED'));
      return;
    }
    if (unavailableIndexes.length) {
      notify.error(t('CONFIG_REFERENCE_UNAVAILABLE'));
      return;
    }
    saveMutation.mutate(
      buildConfigReferencePatch(detailQuery.data as any, names, references, reloaderEnabled),
    );
  };

  return (
    <Card padding={24}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button type="button" onClick={onBack}>
          {t('CONFIG_REFERENCE_BACK')}
        </Button>
        <div>
          <h1 style={{ margin: 0 }}>{t('CONFIG_REFERENCE')}</h1>
          <p style={{ margin: '4px 0 0', color: colors.textMutedAlt }}>
            {workloadKind} · {name}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <strong>{t('CONFIG_REFERENCE_CONTAINER')}</strong>
        <Select
          aria-label={t('CONFIG_REFERENCE_ARIA_CONTAINER')}
          style={{ width: '100%', marginTop: 8 }}
          value={names}
          options={containers.map(value => ({ label: value, value }))}
          onChange={value => updateContainer(String(value))}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{t('CONFIG_REFERENCE_RESOURCES')}</strong>
          <p style={{ margin: '4px 0 0', color: colors.textMutedAlt }}>
            {t('CONFIG_REFERENCE_SECRET_NOTICE')}
          </p>
        </div>
        <Button type="button" onClick={addReference} disabled={resourceLoading}>
          {t('CONFIG_REFERENCE_ADD')}
        </Button>
      </div>

      {resourceLoading && (
        <div role="status" style={{ padding: '16px 0' }}>
          {t('CONFIG_REFERENCE_LOADING')}
        </div>
      )}
      {resourceError && (
        <div role="alert" style={{ padding: '16px 0' }}>
          <span>{t('CONFIG_REFERENCE_LOAD_ERROR')}</span>{' '}
          <Button type="button" onClick={() => setReloadKey(current => current + 1)}>
            {t('CONFIG_REFERENCE_RETRY')}
          </Button>
        </div>
      )}
      {!resourceLoading && !resourceError && references.length === 0 && (
        <div style={{ padding: '24px 0', color: colors.textMutedAlt }}>
          {t('CONFIG_REFERENCE_EMPTY')}
        </div>
      )}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
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
            <div key={`${index}-${reference.kind}`} style={{ display: 'grid', gap: 2 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns.panel,
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  border: '1px solid #d8dee9',
                  borderRadius: 6,
                }}
              >
                <Select
                  aria-label={t('CONFIG_REFERENCE_ARIA_KIND', { index: index + 1 })}
                  value={reference.kind}
                  options={[
                    { label: 'ConfigMap', value: 'configMap' },
                    { label: 'Secret', value: 'secret' },
                  ]}
                  onChange={value =>
                    setReferences(current =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, kind: value as ConfigReferenceKind, name: '' }
                          : item,
                      ),
                    )
                  }
                />
                <Select
                  aria-label={t('CONFIG_REFERENCE_ARIA_RESOURCE', { index: index + 1 })}
                  value={reference.name}
                  options={resourceOptions}
                  loading={resourceLoading}
                  onChange={value =>
                    setReferences(current =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: String(value || '') } : item,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={t('CONFIG_REFERENCE_ARIA_PREFIX', { index: index + 1 })}
                  value={reference.prefix || ''}
                  placeholder={t('CONFIG_REFERENCE_PREFIX_PLACEHOLDER')}
                  onChange={event =>
                    setReferences(current =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, prefix: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  onClick={() => setReferences(current => current.filter((_, i) => i !== index))}
                >
                  删除
                </Button>
                {duplicate && (
                  <span role="alert" style={{ color: colors.danger, gridColumn: '1 / -1' }}>
                    {t('CONFIG_REFERENCE_DUPLICATE')}
                  </span>
                )}
                {unavailable && (
                  <span role="alert" style={{ color: colors.danger, gridColumn: '1 / -1' }}>
                    {t('CONFIG_REFERENCE_UNAVAILABLE')}
                  </span>
                )}
              </div>
              <ConfigReferencePreview
                kind={reference.kind}
                identity={`${reference.kind}:${reference.name}:${reference.prefix || ''}`}
                preview={previews[index]}
                error={saveError && saveError.index === index ? saveError.message : undefined}
              />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e5e9f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>{t('CONFIG_REFERENCE_AUTO_RELOAD')}</strong>
            <p style={{ margin: '4px 0 0', color: colors.textMutedAlt }}>
              {t('CONFIG_REFERENCE_AUTO_RELOAD_DESC')}
            </p>
          </div>
          <Switch
            variant="button"
            label={t(reloaderEnabled ? 'CONFIG_REFERENCE_ENABLED' : 'CONFIG_REFERENCE_DISABLED')}
            checked={reloaderEnabled}
            onChange={checked => setReloaderEnabled(checked)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
        <Button type="button" onClick={onBack}>
          {t('CONFIG_REFERENCE_CANCEL')}
        </Button>
        <Button type="button" color="primary" loading={saveMutation.isLoading} onClick={save}>
          {t('CONFIG_REFERENCE_SAVE')}
        </Button>
      </div>
    </Card>
  );
}
