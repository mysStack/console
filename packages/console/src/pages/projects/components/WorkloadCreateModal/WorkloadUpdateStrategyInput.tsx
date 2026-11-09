/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { ChevronDown, Update } from '@kubed/icons';
import { Input, InputNumber, Select } from '@kubed/components';
import type { WorkloadKind, WorkloadSettingsValues } from './deployment';

interface Props {
  kind: WorkloadKind;
  value?: WorkloadSettingsValues['updateStrategy'];
  onChange?: (value: WorkloadSettingsValues['updateStrategy']) => void;
}

interface StrategyFieldProps {
  htmlFor: string;
  label: string;
  description: string;
  children: React.ReactNode;
}

// 与 V3 表单一致：标签在输入框上方并带必填标记，字段说明在输入框下方。
function StrategyField({ htmlFor, label, description, children }: StrategyFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{ display: 'block', marginBottom: 4, color: '#36435c', fontWeight: 400 }}
      >
        {label}
        <span aria-hidden="true" style={{ color: '#ca2621', marginLeft: 4 }}>
          *
        </span>
      </label>
      {children}
      <p style={{ color: '#79879c', margin: '4px 0 0', fontSize: 12, lineHeight: 1.67 }}>
        {description}
      </p>
    </div>
  );
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
  const columns = kind === 'Deployment' ? '1fr 1fr' : '1fr';
  const options = [
    { label: t('ROLLING_UPDATE_RECOMMENDED'), value: 'RollingUpdate' },
    kind === 'Deployment'
      ? { label: t('SIMULTANEOUS_UPDATE'), value: 'Recreate' }
      : { label: t('ONDELETE'), value: 'OnDelete' },
  ];
  const selectedLabel = options.find(option => option.value === value.type)?.label;
  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <div
        data-test="workload-update-strategy-card"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid #e3e9ef',
          borderRadius: 4,
          padding: '8px 12px',
          background: '#fff',
        }}
      >
        <Update size={40} color="#36435c" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#36435c', fontWeight: 600 }}>{selectedLabel}</div>
          <p style={{ color: '#79879c', margin: '4px 0 0', fontSize: 12, lineHeight: 1.67 }}>
            {t(description)}
          </p>
        </div>
        <ChevronDown size={20} color="#36435c" />
        <Select
          aria-label={t('UPDATE_STRATEGY')}
          value={value.type}
          options={options}
          onChange={type => update({ type })}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}
        />
      </div>
      {value.type === 'RollingUpdate' && (
        <details
          data-test="workload-update-strategy-settings"
          style={{
            border: '1px solid #e3e9ef',
            borderRadius: 4,
            padding: '8px 12px',
            background: '#fff',
          }}
        >
          <summary
            data-test="workload-update-strategy-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              color: '#36435c',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              listStyle: 'none',
            }}
          >
            <ChevronDown size={20} />
            {t('ROLLING_UPDATE_SETTINGS')}
          </summary>
          <div
            data-test="workload-update-strategy-fields"
            style={{
              display: 'grid',
              gridTemplateColumns: columns,
              gap: '16px 20px',
              marginTop: 8,
              padding: 12,
              background: '#f9fbfd',
              borderRadius: 4,
            }}
          >
            {kind === 'StatefulSet' ? (
              <StrategyField
                htmlFor="workload-partition-ordinal"
                label={t('PARTITION_ORDINAL')}
                description={t('PARTITION_ORDINAL_DESC')}
              >
                <InputNumber
                  id="workload-partition-ordinal"
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
              </StrategyField>
            ) : (
              <>
                <StrategyField
                  htmlFor="workload-max-unavailable-pods"
                  label={t('MAX_UNAVAILABLE_PODS')}
                  description={t('MAX_UNAVAILABLE_PODS_DESC')}
                >
                  <Input
                    id="workload-max-unavailable-pods"
                    aria-label={t('MAX_UNAVAILABLE_PODS')}
                    value={value.maxUnavailable ?? ''}
                    onChange={event => update({ maxUnavailable: event.target.value })}
                  />
                </StrategyField>
                {kind === 'Deployment' && (
                  <StrategyField
                    htmlFor="workload-max-extra-pods"
                    label={t('MAX_EXTRA_PODS')}
                    description={t('MAX_EXTRA_PODS_DESC')}
                  >
                    <Input
                      id="workload-max-extra-pods"
                      aria-label={t('MAX_EXTRA_PODS')}
                      value={value.maxSurge ?? ''}
                      onChange={event => update({ maxSurge: event.target.value })}
                    />
                  </StrategyField>
                )}
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
