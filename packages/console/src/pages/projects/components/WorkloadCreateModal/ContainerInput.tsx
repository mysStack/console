/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Input, InputNumber, Select } from '@kubed/components';
import { ArrayInput } from '@ks-console/shared';
import { ContainerCreateValues, ContainerPortValues, EnvironmentValues } from './deployment';

function PortInput({
  value = {},
  onChange,
}: {
  value?: ContainerPortValues;
  onChange?: (value: ContainerPortValues) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <Input
        aria-label={t('NAME')}
        placeholder={t('NAME')}
        value={value.name || ''}
        onChange={event => onChange?.({ ...value, name: event.target.value })}
      />
      <InputNumber
        aria-label={t('CONTAINER_PORT')}
        placeholder={t('CONTAINER_PORT')}
        min={1}
        max={65535}
        precision={0}
        value={value.containerPort}
        onChange={containerPort =>
          onChange?.({
            ...value,
            containerPort:
              containerPort == null || containerPort === '' ? undefined : Number(containerPort),
          })
        }
      />
      <Select
        aria-label={t('PROTOCOL')}
        value={value.protocol || 'TCP'}
        options={['TCP', 'UDP', 'SCTP'].map(protocol => ({ label: protocol, value: protocol }))}
        onChange={protocol => onChange?.({ ...value, protocol })}
      />
    </div>
  );
}

function EnvironmentInput({
  value = { name: '' },
  onChange,
}: {
  value?: EnvironmentValues;
  onChange?: (value: EnvironmentValues) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <Input
        aria-label={t('NAME')}
        placeholder={t('NAME')}
        value={value.name || ''}
        onChange={event => onChange?.({ ...value, name: event.target.value })}
      />
      <Input
        aria-label={t('VALUE')}
        placeholder={t('VALUE')}
        value={value.value || ''}
        onChange={event => onChange?.({ ...value, value: event.target.value })}
      />
    </div>
  );
}

interface Props {
  value?: ContainerCreateValues;
  onChange?: (value: ContainerCreateValues) => void;
  index?: number;
  kind: 'CONTAINER' | 'INIT_CONTAINER';
}

export default function ContainerInput({
  value = { name: '', image: '' },
  onChange,
  index = 0,
  kind,
}: Props) {
  const update = (patch: Partial<ContainerCreateValues>) => onChange?.({ ...value, ...patch });
  return (
    <div role="group" aria-label={`${t(kind)} ${index + 1}`} style={{ width: '100%', minWidth: 0 }}>
      <h4>
        {t(kind)} {index + 1}
      </h4>
      <label>
        {t('CONTAINER_NAME')}
        <Input
          aria-label={t('CONTAINER_NAME')}
          value={value.name || ''}
          maxLength={63}
          onChange={event => update({ name: event.target.value })}
        />
      </label>
      <label>
        {t('CONTAINER_IMAGE')}
        <Input
          aria-label={t('CONTAINER_IMAGE')}
          value={value.image || ''}
          placeholder="nginx:alpine"
          onChange={event => update({ image: event.target.value })}
        />
      </label>
      <label>
        {t('IMAGE_PULL_POLICY')}
        <Select
          aria-label={t('IMAGE_PULL_POLICY')}
          value={value.imagePullPolicy || 'IfNotPresent'}
          options={[
            { label: t('IMAGE_PULL_POLICY_IFNOTPRESENT'), value: 'IfNotPresent' },
            { label: t('IMAGE_PULL_POLICY_ALWAYS'), value: 'Always' },
            { label: t('IMAGE_PULL_POLICY_NEVER'), value: 'Never' },
          ]}
          onChange={imagePullPolicy => update({ imagePullPolicy })}
        />
      </label>
      <div role="group" aria-label={t('PORT_SETTINGS')}>
        <h4>{t('PORT_SETTINGS')}</h4>
        <ArrayInput
          itemType="object"
          value={value.ports || []}
          addText={t('ADD_PORT')}
          checkItemValid={() => true}
          onChange={ports => update({ ports })}
        >
          <PortInput />
        </ArrayInput>
      </div>
      <div role="group" aria-label={t('ENVIRONMENT_VARIABLE_PL')}>
        <h4>{t('ENVIRONMENT_VARIABLE_PL')}</h4>
        <ArrayInput
          itemType="object"
          value={value.env || []}
          addText={t('WORKLOAD_ADD_ENV')}
          checkItemValid={() => true}
          onChange={env => update({ env })}
        >
          <EnvironmentInput />
        </ArrayInput>
      </div>
    </div>
  );
}
