import React, { useEffect, useMemo, useState } from 'react';
import { configMapStore, secretStore } from '@ks-console/shared';
import { Button, FormItem, Input, Select } from '@kubed/components';
import {
  addEnvFromReference,
  changeEnvFromType,
  getDuplicateEnvFromIndexes,
  getUnavailableEnvFromIndexes,
  getEnvFromReferenceViewState,
  getEnvFromReferenceReloadState,
  getNextEnvFromReferenceReloadKey,
  removeEnvFromReference,
  updateEnvFromReference,
  toNameOptions,
} from './envFromReference';
import type { EnvFromReference, EnvFromReferenceType } from './types';

export { toNameOptions } from './envFromReference';
type Option = { label: string; value: string };

interface Props {
  cluster: string;
  namespace: string;
  value: EnvFromReference[];
  onChange: (rows: EnvFromReference[]) => void;
  onValidityChange?: (valid: boolean) => void;
}

const EnvFromReferenceList = ({ cluster, namespace, value, onChange, onValidityChange }: Props) => {
  const rows = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [configMaps, setConfigMaps] = useState<Option[]>([]);
  const [secrets, setSecrets] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    const reload = getEnvFromReferenceReloadState();
    setConfigMaps(reload.configMaps);
    setSecrets(reload.secrets);
    setLoading(reload.loading);
    setError(reload.error);
    Promise.all([
      configMapStore.fetchListByK8s({ cluster, namespace }),
      secretStore.fetchNameListByK8s({ cluster, namespace }),
    ])
      .then(([maps, names]) => {
        if (active) {
          setConfigMaps(toNameOptions(maps));
          setSecrets(toNameOptions(names.map(name => ({ name }))));
        }
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cluster, namespace, reloadKey]);
  const duplicates = useMemo(() => getDuplicateEnvFromIndexes(rows), [rows]);
  const viewState = getEnvFromReferenceViewState(loading, error, rows);
  const unavailable = useMemo(
    () => getUnavailableEnvFromIndexes(rows, configMaps, secrets),
    [rows, configMaps, secrets],
  );
  useEffect(() => {
    onValidityChange?.(
      rows.length === 0 ||
        (viewState.kind === 'ready' && !duplicates.length && !unavailable.length),
    );
  }, [duplicates.length, onValidityChange, rows.length, unavailable.length, viewState.kind]);
  if (viewState.kind === 'loading') return <div role="status">Loading…</div>;
  if (viewState.kind === 'error')
    return (
      <div role="alert">
        <span>Unable to load ConfigMaps and Secrets</span>
        <Button
          type="button"
          onClick={() => setReloadKey(current => getNextEnvFromReferenceReloadKey(current))}
        >
          重试
        </Button>
      </div>
    );
  if (viewState.kind === 'empty')
    return (
      <div>
        <p>暂无配置/密钥引用</p>
        <Button type="button" onClick={() => onChange(addEnvFromReference(rows))}>
          添加引用
        </Button>
      </div>
    );
  return (
    <div>
      {rows.map((row, index) => {
        const options = row.type === 'secret' ? secrets : configMaps;
        const duplicate = duplicates.includes(index);
        const isUnavailable = unavailable.includes(index);
        const resourceOptions = [
          ...(isUnavailable
            ? [{ label: `${row.name}（不可用）`, value: row.name, disabled: true }]
            : []),
          { label: '请选择', value: '' },
          ...options,
        ];
        return (
          <div key={index}>
            <FormItem label="引用类型">
              {() => (
                <Select
                  aria-label="引用类型"
                  value={row.type}
                  options={[
                    { label: 'ConfigMap', value: 'configMap' },
                    { label: 'Secret', value: 'secret' },
                  ]}
                  onChange={next =>
                    onChange(changeEnvFromType(rows, index, next as EnvFromReferenceType))
                  }
                />
              )}
            </FormItem>
            <FormItem label="引用资源">
              {() => (
                <Select
                  aria-label="引用资源"
                  value={row.name}
                  options={resourceOptions}
                  onChange={next =>
                    onChange(updateEnvFromReference(rows, index, { name: String(next || '') }))
                  }
                />
              )}
            </FormItem>
            <FormItem label="前缀">
              {() => (
                <Input
                  aria-label="前缀"
                  value={row.prefix}
                  onChange={e =>
                    onChange(updateEnvFromReference(rows, index, { prefix: e.target.value }))
                  }
                />
              )}
            </FormItem>
            {duplicate && <span role="alert">重复引用</span>}
            {isUnavailable && <span role="alert">引用资源不可用，请重新选择</span>}
            <Button type="button" onClick={() => onChange(removeEnvFromReference(rows, index))}>
              删除
            </Button>
          </div>
        );
      })}
      <Button type="button" onClick={() => onChange(addEnvFromReference(rows))}>
        添加引用
      </Button>
    </div>
  );
};
export default EnvFromReferenceList;
