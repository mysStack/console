/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useState } from 'react';
import { cloneDeep } from 'lodash';
import { Button, Modal } from '@kubed/components';
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

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          <strong>{value.name || `${t(kind)} ${index + 1}`}</strong>
          <div>{value.image || t('CONTAINER_IMAGE')}</div>
        </div>
        <Button onClick={() => setDraft(cloneDeep(value))}>{t('EDIT_CONTAINER')}</Button>
      </div>
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
