/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Input, Select } from '@kubed/components';
import type { VolumeValues } from './deployment';
import type { WorkloadResourceOptions } from './ContainerInput';

const toOptions = (items: string[]) => items.map(item => ({ label: item, value: item }));

interface Props {
  value?: VolumeValues;
  onChange?: (value: VolumeValues) => void;
  resourceOptions: WorkloadResourceOptions;
}

export default function VolumeInput({
  value = { name: '', type: 'emptyDir' },
  onChange,
  resourceOptions,
}: Props) {
  const update = (patch: Partial<VolumeValues>) => onChange?.({ ...value, ...patch });
  const resourceNames =
    value.type === 'persistentVolumeClaim'
      ? resourceOptions.persistentVolumeClaims
      : value.type === 'configMap'
        ? resourceOptions.configMaps
        : resourceOptions.secrets;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 220px 1fr', gap: 8, width: '100%' }}>
      <Input
        aria-label={t('VOLUME_NAME')}
        placeholder={t('VOLUME_NAME')}
        value={value.name || ''}
        onChange={event => update({ name: event.target.value })}
      />
      <Select
        aria-label={t('TYPE')}
        value={value.type}
        options={[
          { label: 'PersistentVolumeClaim', value: 'persistentVolumeClaim' },
          { label: 'emptyDir', value: 'emptyDir' },
          { label: 'HostPath', value: 'hostPath' },
          { label: 'ConfigMap', value: 'configMap' },
          { label: 'Secret', value: 'secret' },
        ]}
        onChange={type => onChange?.({ name: value.name, type })}
      />
      {['persistentVolumeClaim', 'configMap', 'secret'].includes(value.type) && (
        <Select
          aria-label={t('WORKLOAD_REFERENCE_RESOURCE')}
          value={value.sourceName || ''}
          options={toOptions(resourceNames)}
          placeholder={t('WORKLOAD_SELECT_RESOURCE')}
          onChange={sourceName => update({ sourceName: String(sourceName) })}
        />
      )}
      {value.type === 'hostPath' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8 }}>
          <Input
            aria-label="HostPath"
            placeholder="/var/lib/data"
            value={value.hostPath || ''}
            onChange={event => update({ hostPath: event.target.value })}
          />
          <Select
            aria-label={t('PATH_TYPE')}
            value={value.hostPathType || ''}
            options={['', 'DirectoryOrCreate', 'Directory', 'FileOrCreate', 'File', 'Socket'].map(
              type => ({ label: type || t('WORKLOAD_PATH_TYPE_UNSET'), value: type }),
            )}
            onChange={hostPathType => update({ hostPathType: String(hostPathType) })}
          />
        </div>
      )}
      {value.type === 'emptyDir' && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
          <Select
            aria-label={t('WORKLOAD_EMPTY_DIR_MEDIUM')}
            value={value.medium || ''}
            options={[
              { label: t('WORKLOAD_NODE_STORAGE'), value: '' },
              { label: t('MEMORY'), value: 'Memory' },
            ]}
            onChange={medium => update({ medium })}
          />
          <Input
            aria-label={t('WORKLOAD_SIZE_LIMIT')}
            placeholder="128Mi"
            value={value.sizeLimit || ''}
            onChange={event => update({ sizeLimit: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
