/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Input, InputNumber, Select } from '@kubed/components';
import type { WorkloadKind, WorkloadSettingsValues } from './deployment';

interface Props {
  kind: WorkloadKind;
  value?: WorkloadSettingsValues['updateStrategy'];
  onChange?: (value: WorkloadSettingsValues['updateStrategy']) => void;
}

export default function WorkloadUpdateStrategyInput({
  kind,
  value = { type: 'RollingUpdate' },
  onChange,
}: Props) {
  const update = (patch: Partial<WorkloadSettingsValues['updateStrategy']>) =>
    onChange?.({ ...value, ...patch });
  const description =
    value.type === 'RollingUpdate'
      ? 'ROLLINGUPDATE_DESC'
      : value.type === 'Recreate'
        ? 'SIMULTANEOUS_UPDATE_DESC'
        : 'ONDELETE_DESC';
  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <div
        data-test="workload-update-strategy-card"
        style={{ border: '1px solid #d9e2ec', borderRadius: 4, padding: 16 }}
      >
        <Select
          aria-label={t('UPDATE_STRATEGY')}
          value={value.type}
          options={[
            { label: t('ROLLING_UPDATE_RECOMMENDED'), value: 'RollingUpdate' },
            kind === 'Deployment'
              ? { label: t('SIMULTANEOUS_UPDATE'), value: 'Recreate' }
              : { label: t('ONDELETE'), value: 'OnDelete' },
          ]}
          onChange={type => update({ type })}
        />
        <p style={{ color: '#79879c', margin: '8px 0 0' }}>{t(description)}</p>
      </div>
      {value.type === 'RollingUpdate' && (
        <div
          data-test="workload-update-strategy-settings"
          style={{ border: '1px solid #d9e2ec', borderRadius: 4, padding: 16 }}
        >
          {kind === 'StatefulSet' ? (
            <label>
              {t('PARTITION_ORDINAL')}
              <InputNumber
                aria-label={t('PARTITION_ORDINAL')}
                value={value.partition}
                min={0}
                precision={0}
                onChange={partition =>
                  update({
                    partition:
                      partition === null || partition === '' ? undefined : Number(partition),
                  })
                }
              />
            </label>
          ) : (
            <>
              <label>
                {t('MAX_UNAVAILABLE_PODS')}
                <Input
                  aria-label={t('MAX_UNAVAILABLE_PODS')}
                  value={value.maxUnavailable ?? ''}
                  onChange={event => update({ maxUnavailable: event.target.value })}
                />
              </label>
              {kind === 'Deployment' && (
                <label>
                  {t('MAX_EXTRA_PODS')}
                  <Input
                    aria-label={t('MAX_EXTRA_PODS')}
                    value={value.maxSurge ?? ''}
                    onChange={event => update({ maxSurge: event.target.value })}
                  />
                </label>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
