/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Button } from '@kubed/components';
import { Trash } from '@kubed/icons';

export interface WorkloadCardAddEntry {
  text: string;
  description?: string;
  icon?: React.ReactNode;
  createValue: () => unknown;
}

interface Props {
  value?: unknown[];
  onChange?: (value: unknown[]) => void;
  checkItemValid?: (item: unknown) => boolean;
  itemStyle?: React.CSSProperties;
  adds: WorkloadCardAddEntry[];
  children: React.ReactElement;
}

function AddCard({
  entry,
  disabled,
  onClick,
}: {
  entry: WorkloadCardAddEntry;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={entry.text}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: 12,
        border: '1px dashed #ccd3db',
        borderRadius: 4,
        background: '#fff',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#a3adc2' : undefined,
      }}
    >
      {entry.icon}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: 'inherit', fontWeight: 600 }}>{entry.text}</span>
        {entry.description && (
          <span style={{ display: 'block', marginTop: 2, color: '#79879c' }}>
            {entry.description}
          </span>
        )}
      </span>
    </button>
  );
}

// 列表项与新增入口按 V3 编辑设置卡片样式渲染。
export default function WorkloadCardListInput({
  value = [],
  onChange,
  checkItemValid,
  itemStyle,
  adds,
  children,
}: Props) {
  const items = value || [];
  const canAdd = checkItemValid ? items.every(checkItemValid) : true;

  const renderAddCards = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: adds.length > 1 ? '1fr 1fr' : '1fr',
        gap: 12,
        marginTop: items.length > 0 ? 12 : 0,
      }}
    >
      {adds.map(entry => (
        <AddCard
          key={entry.text}
          entry={entry}
          disabled={!canAdd}
          onClick={() => onChange?.([...items, entry.createValue()])}
        />
      ))}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 8, width: '100%' }}>
      {items.map((item, index) => (
        <div key={index} style={{ position: 'relative', ...itemStyle }}>
          {React.cloneElement(children, {
            index,
            value: item,
            onChange: (nextValue: unknown) =>
              onChange?.(
                items.map((current, currentIndex) =>
                  currentIndex === index ? nextValue : current,
                ),
              ),
          })}
          <Button
            variant="text"
            aria-label={t('DELETE')}
            onClick={() => onChange?.(items.filter((_, currentIndex) => currentIndex !== index))}
            style={{ position: 'absolute', top: 8, right: 8, padding: 4 }}
          >
            <Trash size={16} />
          </Button>
        </div>
      ))}
      {renderAddCards()}
    </div>
  );
}
