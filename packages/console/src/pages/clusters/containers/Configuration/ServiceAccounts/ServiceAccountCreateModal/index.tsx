/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Form, FormItem, Input, Modal, useForm } from '@kubed/components';

import { NamespaceSelector } from '@ks-console/shared';

interface Props {
  visible: boolean;
  cluster?: string;
  workspace?: string;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

function ServiceAccountCreateModal({
  visible,
  cluster = '',
  workspace,
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm();

  return (
    <Modal
      title={t('CREATE')}
      width={691}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      bodyStyle={{ padding: '20px' }}
    >
      <Form form={form} initialValues={{ metadata: { name: '', namespace: '' } }} onFinish={onOk}>
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
      </Form>
    </Modal>
  );
}

export default ServiceAccountCreateModal;
