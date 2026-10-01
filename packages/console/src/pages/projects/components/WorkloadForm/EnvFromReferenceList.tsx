import React, { useEffect, useMemo, useState } from 'react';
import { configMapStore, secretStore } from '@ks-console/shared';
import { Button, FormItem, Input, Select } from '@kubed/components';
import {
  addEnvFromReference,
  changeEnvFromType,
  getDuplicateEnvFromIndexes,
  getEnvFromReferenceViewState,
  getEnvFromReferenceReloadState,
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
}

const EnvFromReferenceList = ({ cluster, namespace, value, onChange }: Props) => {
  const [configMaps, setConfigMaps] = useState<Option[]>([]);
  const [secrets, setSecrets] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
  }, [cluster, namespace]);
  const duplicates = useMemo(() => getDuplicateEnvFromIndexes(value), [value]);
  const viewState = getEnvFromReferenceViewState(loading, error, value);
  if (viewState.kind === 'loading') return <div role="status">Loading…</div>;
  if (viewState.kind === 'error')
    return <div role="alert">Unable to load ConfigMaps and Secrets</div>;
  if (viewState.kind === 'empty')
    return (
      <div>
        <p>暂无配置/密钥引用</p>
        <Button type="button" onClick={() => onChange(addEnvFromReference(value))}>
          添加引用
        </Button>
      </div>
    );
  return (
    <div>
      {value.map((row, index) => {
        const options = row.type === 'secret' ? secrets : configMaps;
        const duplicate = duplicates.includes(index);
        return (
          <div key={index}>
            <FormItem label="引用类型">
              <Select
                aria-label="引用类型"
                value={row.type}
                options={[
                  { label: 'ConfigMap', value: 'configMap' },
                  { label: 'Secret', value: 'secret' },
                ]}
                onChange={next =>
                  onChange(changeEnvFromType(value, index, next as EnvFromReferenceType))
                }
              />
            </FormItem>
            <FormItem label="引用资源">
              <Select
                aria-label="引用资源"
                value={row.name}
                options={[{ label: '请选择', value: '' }, ...options]}
                onChange={next =>
                  onChange(updateEnvFromReference(value, index, { name: String(next || '') }))
                }
              />
            </FormItem>
            <FormItem label="前缀">
              <Input
                aria-label="前缀"
                value={row.prefix}
                onChange={e =>
                  onChange(updateEnvFromReference(value, index, { prefix: e.target.value }))
                }
              />
            </FormItem>
            {duplicate && <span role="alert">重复引用</span>}
            <Button type="button" onClick={() => onChange(removeEnvFromReference(value, index))}>
              删除
            </Button>
          </div>
        );
      })}
      <Button type="button" onClick={() => onChange(addEnvFromReference(value))}>
        添加引用
      </Button>
    </div>
  );
};
export default EnvFromReferenceList;
