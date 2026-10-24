/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Select } from '@kubed/components';
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

  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <Select
        aria-label={t('POD_SCHEDULING_RULES')}
        value={value.mode}
        options={modeOptions}
        onChange={setMode}
      />
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
