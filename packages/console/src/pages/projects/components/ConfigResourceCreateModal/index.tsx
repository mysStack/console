/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Form, FormItem, Input, Modal, useForm } from '@kubed/components';

import { NamespaceSelector } from '@ks-console/shared';
import { ConfigMapSettings, SecretSettings } from '../../../clusters/components';

type ResourceModule = 'configmaps' | 'secrets';

interface Props {
  module: ResourceModule;
  visible: boolean;
  cluster?: string;
  workspace?: string;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

const getInitialValues = (module: ResourceModule) => ({
  metadata: {
    name: '',
    namespace: '',
  },
  ...(module === 'secrets' ? { type: 'Opaque' } : {}),
  data: {},
});

function ConfigResourceCreateModal({
  module,
  visible,
  cluster = '',
  workspace,
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm();
  const initialValues = getInitialValues(module);
  const handleSubmit = () => {
    form.validateFields().then(data => onOk(data));
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
          <NamespaceSelector cluster={cluster} workspace={workspace} style={{ width: '100%' }} />
        </FormItem>
        {module === 'secrets' ? (
          <SecretSettings
            form={form}
            formTemplate={initialValues as any}
            isFederated={false}
            mode="create"
            onOk={() => undefined}
          />
        ) : (
          <ConfigMapSettings
            form={form}
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
