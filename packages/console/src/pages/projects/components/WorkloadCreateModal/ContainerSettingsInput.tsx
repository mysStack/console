/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useState } from 'react';
import { cloneDeep } from 'lodash';
import { Modal } from '@kubed/components';
import { Container } from '@kubed/icons';
import ContainerInput from './ContainerInput';
import { ContainerCreateValues, validateContainers } from './deployment';

type Props = React.ComponentProps<typeof ContainerInput>;

export default function ContainerSettingsInput({
  value = { name: '', image: '' },
  onChange,
  kind,
  index = 0,
  volumeNames = [],
  ...options
}: Props) {
  const [draft, setDraft] = useState<ContainerCreateValues | null>(null);
  const [error, setError] = useState<string>();
  const close = () => {
    setDraft(null);
    setError(undefined);
  };
  const apply = () => {
    if (!draft) return;
    // 这里只校验当前容器及已登记的卷名；外层表单仍执行跨容器/卷的完整校验。
    const validationError = validateContainers(
      [draft],
      [],
      volumeNames.map(name => ({ name, type: 'emptyDir' })),
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    onChange?.(cloneDeep(draft));
    close();
  };

  const limits = value.resources?.limits || {};
  const limitLabel =
    Object.values(limits).filter(Boolean).length > 0
      ? Object.entries(limits)
          .filter(([, quantity]) => quantity)
          .map(([resource, quantity]) => `${resource.toUpperCase()} ${quantity}`)
          .join(' / ')
      : t('NO_RESOURCE_LIMIT');

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <button
        type="button"
        aria-label={`${t('EDIT_CONTAINER')} ${value.name}`}
        onClick={() => setDraft(cloneDeep(value))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '12px 44px 12px 12px',
          border: '1px solid #e3e9ef',
          borderRadius: 4,
          background: '#fff',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <Container size={40} color="#36435c" />
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          <strong style={{ display: 'block', color: '#36435c' }}>
            {value.name || `${t(kind)} ${index + 1}`}
          </strong>
          <span style={{ display: 'block', marginTop: 4, color: '#79879c' }}>
            {t('IMAGE')}: {value.image || t('CONTAINER_IMAGE')}
          </span>
        </span>
        <span style={{ color: '#79879c', whiteSpace: 'nowrap' }}>{limitLabel}</span>
      </button>
      {draft && (
        <Modal
          visible
          title={t('EDIT_CONTAINER')}
          width={880}
          maskClosable={false}
          onOk={apply}
          onCancel={close}
          bodyStyle={{ maxHeight: '68vh', overflowY: 'auto' }}
        >
          {error && <div role="alert">{t(error)}</div>}
          <ContainerInput
            {...options}
            kind={kind}
            index={index}
            volumeNames={volumeNames}
            value={draft}
            onChange={next => {
              setDraft(next);
              setError(undefined);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
