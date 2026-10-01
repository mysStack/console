import React, { useEffect, useMemo, useState } from 'react';
import { configMapStore, secretStore } from '@ks-console/shared';
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
        <button type="button" onClick={() => onChange(addEnvFromReference(value))}>
          添加引用
        </button>
      </div>
    );
  return (
    <div>
      {value.map((row, index) => {
        const options = row.type === 'secret' ? secrets : configMaps;
        const duplicate = duplicates.includes(index);
        return (
          <div key={index}>
            <label>
              引用类型
              <select
                aria-label="引用类型"
                value={row.type}
                onChange={e =>
                  onChange(changeEnvFromType(value, index, e.target.value as EnvFromReferenceType))
                }
              >
                <option value="configMap">ConfigMap</option>
                <option value="secret">Secret</option>
              </select>
            </label>
            <label>
              引用资源
              <select
                aria-label="引用资源"
                value={row.name}
                onChange={e =>
                  onChange(updateEnvFromReference(value, index, { name: e.target.value }))
                }
              >
                <option value="">请选择</option>
                {options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              前缀
              <input
                aria-label="前缀"
                value={row.prefix}
                onChange={e =>
                  onChange(updateEnvFromReference(value, index, { prefix: e.target.value }))
                }
              />
            </label>
            {duplicate && <span role="alert">重复引用</span>}
            <button type="button" onClick={() => onChange(removeEnvFromReference(value, index))}>
              删除
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange(addEnvFromReference(value))}>
        添加引用
      </button>
    </div>
  );
};
export default EnvFromReferenceList;
