export type NameResource = { name?: string; metadata?: { name?: string } };
export type NameOption = { label: string; value: string };

export const toNameOptions = (items: NameResource[] = []): NameOption[] =>
  items.reduce<NameOption[]>((out, item) => {
    const name = item?.name || item?.metadata?.name;
    if (name) out.push({ label: name, value: name });
    return out;
  }, []);

import type { EnvFromReference, EnvFromReferenceType } from './types';
import { findDuplicateEnvFrom } from './envFrom';
export const addEnvFromReference = (rows: EnvFromReference[]) => [
  ...rows,
  { type: 'configMap' as const, name: '', prefix: '' },
];
export const updateEnvFromReference = (
  rows: EnvFromReference[],
  index: number,
  patch: Partial<EnvFromReference>,
) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
export const removeEnvFromReference = (rows: EnvFromReference[], index: number) =>
  rows.filter((_, i) => i !== index);
export const changeEnvFromType = (
  rows: EnvFromReference[],
  index: number,
  type: EnvFromReferenceType,
) => updateEnvFromReference(rows, index, { type, name: '' });
export const getDuplicateEnvFromIndexes = (rows: EnvFromReference[]) =>
  findDuplicateEnvFrom(rows).map(item => item.index);
export const getUnavailableEnvFromIndexes = (
  rows: EnvFromReference[],
  configMaps: NameOption[],
  secrets: NameOption[],
) => {
  const available = {
    configMap: new Set(configMaps.map(option => option.value)),
    secret: new Set(secrets.map(option => option.value)),
  };
  return rows.reduce<number[]>((indexes, row, index) => {
    if (row.name && !available[row.type].has(row.name)) indexes.push(index);
    return indexes;
  }, []);
};
export const getEnvFromReferenceViewState = (
  loading: boolean,
  error: boolean,
  rows: EnvFromReference[],
) =>
  ({
    kind: loading ? 'loading' : error ? 'error' : rows.length ? 'ready' : 'empty',
  }) as const;
export const getEnvFromReferenceReloadState = () => ({
  configMaps: [] as NameOption[],
  secrets: [] as NameOption[],
  loading: true,
  error: false,
});
