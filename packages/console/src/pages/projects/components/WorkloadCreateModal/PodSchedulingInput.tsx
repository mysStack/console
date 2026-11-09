/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Select } from '@kubed/components';
import { ChevronDown } from '@kubed/icons';
import { ArrayInput, ObjectInput } from '@ks-console/shared';
import type { PodSchedulingRuleValues, PodSchedulingValues } from './deployment';

interface Props {
  value?: PodSchedulingValues;
  targets?: string[];
  onChange?: (value: PodSchedulingValues) => void;
}

const isCompleteRule = (rule: PodSchedulingRuleValues) =>
  Boolean(rule.policy && rule.type && rule.target);

export default function PodSchedulingInput({
  value = { mode: 'default' },
  targets = [],
  onChange,
}: Props) {
  const setMode = (mode: PodSchedulingValues['mode']) =>
    onChange?.({
      mode,
      ...(mode === 'custom'
        ? { rules: value.mode === 'custom' && value.rules?.length ? value.rules : [{}] }
        : {}),
    });
  const options = targets.map(target => ({ label: target, value: target }));
  const modeOptions = [
    ...(value.mode === 'preserved'
      ? [{ label: t('WORKLOAD_SCHEDULING_PRESERVED'), value: 'preserved' }]
      : []),
    { label: t('DEFAULT_RULES'), value: 'default' },
    { label: t('DECENTRALIZED_SCHEDULING'), value: 'decentralized' },
    { label: t('CENTRALIZED_SCHEDULING'), value: 'aggregation' },
    { label: t('CUSTOM_RULES'), value: 'custom' },
  ];

  const selectedLabel = modeOptions.find(option => option.value === value.mode)?.label;
  const selectedDescription =
    value.mode === 'default'
      ? t('DEFAULT_RULES_DESC')
      : value.mode === 'custom'
        ? t('CUSTOM_RULES_DESC')
        : undefined;

  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <div
        data-test="workload-pod-scheduling-card"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          border: '1px solid #e3e9ef',
          borderRadius: 4,
          background: '#fff',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#36435c', fontWeight: 600 }}>{selectedLabel}</div>
          {selectedDescription && (
            <p style={{ color: '#79879c', margin: '4px 0 0', fontSize: 12, lineHeight: 1.67 }}>
              {selectedDescription}
            </p>
          )}
        </div>
        <ChevronDown size={20} color="#36435c" />
        <Select
          aria-label={t('POD_SCHEDULING_RULES')}
          value={value.mode}
          options={modeOptions}
          onChange={setMode}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}
        />
      </div>
      {value.mode === 'custom' && (
        <ArrayInput
          value={value.rules || []}
          itemType="object"
          addText={t('ADD')}
          checkItemValid={isCompleteRule}
          onChange={rules => onChange?.({ mode: 'custom', rules })}
        >
          <ObjectInput>
            <Select
              name="policy"
              placeholder={t('TYPE')}
              options={[
                { label: t('SCHEDULE_WITH_TARGET'), value: 'podAffinity' },
                { label: t('SCHEDULE_AWAY_FROM_TARGET'), value: 'podAntiAffinity' },
              ]}
            />
            <Select
              name="type"
              placeholder={t('STRATEGY')}
              options={[
                {
                  label: t('MATCH_IF_POSSIBLE'),
                  value: 'preferredDuringSchedulingIgnoredDuringExecution',
                },
                {
                  label: t('MUST_MATCH'),
                  value: 'requiredDuringSchedulingIgnoredDuringExecution',
                },
              ]}
            />
            <Select name="target" placeholder={t('TARGET')} options={options} />
          </ObjectInput>
        </ArrayInput>
      )}
    </div>
  );
}
