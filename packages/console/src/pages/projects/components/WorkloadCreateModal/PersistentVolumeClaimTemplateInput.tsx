/*
 * Please refer to the LICENSE file of the project.
 */

import React from 'react';
import { Input, Select } from '@kubed/components';
import type { PersistentVolumeClaimTemplateValues } from './deployment';

interface Props {
  value?: PersistentVolumeClaimTemplateValues;
  onChange?: (value: PersistentVolumeClaimTemplateValues) => void;
}

const ACCESS_MODES = ['ReadWriteOnce', 'ReadOnlyMany', 'ReadWriteMany', 'ReadWriteOncePod'];

export default function PersistentVolumeClaimTemplateInput({ value, onChange }: Props) {
  const current: PersistentVolumeClaimTemplateValues = {
    name: '',
    accessModes: ['ReadWriteOnce'],
    storage: '',
    ...value,
  };
  const update = (patch: Partial<PersistentVolumeClaimTemplateValues>) =>
    onChange?.({ ...current, ...patch });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 180px 220px 1fr',
        gap: 8,
        width: '100%',
      }}
    >
      <Input
        aria-label={t('PVC_TEMPLATE_NAME')}
        placeholder={t('PVC_TEMPLATE_NAME')}
        value={current.name}
        onChange={event => update({ name: event.target.value })}
      />
      <Input
        aria-label={t('VOLUME_CAPACITY')}
        placeholder="10Gi"
        value={current.storage}
        onChange={event => update({ storage: event.target.value })}
      />
      <Select
        aria-label={t('ACCESS_MODE')}
        mode="multiple"
        value={current.accessModes}
        options={ACCESS_MODES.map(mode => ({ label: mode, value: mode }))}
        onChange={accessModes => update({ accessModes: accessModes as string[] })}
      />
      <Input
        aria-label={t('STORAGE_CLASS')}
        placeholder={t('STORAGE_CLASS')}
        value={current.storageClassName || ''}
        onChange={event => update({ storageClassName: event.target.value })}
      />
    </div>
  );
}
