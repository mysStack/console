/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useRef } from 'react';
import { Form, FormItem, Input, Modal, useForm } from '@kubed/components';

import { NamespaceSelector } from '@ks-console/shared';
import { ConfigMapSettings, SecretSettings } from '../../../clusters/components';
import type { SecretSettingRef } from '../../../clusters/components/ConfigMapEditModal';

type ResourceModule = 'configmaps' | 'secrets';

interface Props {
  module: ResourceModule;
  visible: boolean;
  cluster?: string;
  workspace?: string;
  namespace?: string;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

const getInitialValues = (module: ResourceModule, namespace = '') => ({
  metadata: {
    name: '',
    namespace,
  },
  ...(module === 'secrets' ? { type: 'Opaque' } : {}),
  data: {},
});

function ConfigResourceCreateModal({
  module,
  visible,
  cluster = '',
  workspace,
  namespace,
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm();
  const settingsRef = useRef<SecretSettingRef>(null);
  const initialValues = getInitialValues(module, namespace);

  const validateAndSubmit = () => {
    form.validateFields().then(data => onOk(data));
  };

  const handleSubmit = () => {
    const dataForm = settingsRef.current?.dataFormRef?.current;
    if (dataForm) {
      dataForm.handleSubmit(validateAndSubmit);
      return;
    }

    validateAndSubmit();
  };

  return (
    <Modal
      title={t('CREATE')}
      width={960}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={handleSubmit}
      onCancel={onCancel}
      bodyStyle={{ padding: '20px' }}
    >
      <Form form={form} initialValues={initialValues}>
        <FormItem name={['metadata', 'name']} label={t('NAME')} rules={[{ required: true }]}>
          <Input />
        </FormItem>
        <FormItem
          name={['metadata', 'namespace']}
          label={t('PROJECT')}
          rules={[{ required: true, message: t('PROJECT_EMPTY_DESC') }]}
        >
          {namespace ? (
            <Input disabled />
          ) : (
            <NamespaceSelector cluster={cluster} workspace={workspace} style={{ width: '100%' }} />
          )}
        </FormItem>
        {module === 'secrets' ? (
          <SecretSettings
            form={form}
            ref={settingsRef}
            formTemplate={initialValues as any}
            isFederated={false}
            mode="create"
            onOk={() => undefined}
          />
        ) : (
          <ConfigMapSettings
            form={form}
            ref={settingsRef}
            formTemplate={initialValues as any}
            isFederated={false}
            onOk={() => undefined}
          />
        )}
      </Form>
    </Modal>
  );
}

export default ConfigResourceCreateModal;
