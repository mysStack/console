/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import {
  Form,
  FormItem,
  Input,
  Modal,
  InputNumber,
  Select,
  Textarea,
  useForm,
} from '@kubed/components';

import { buildDeployment, DeploymentCreateValues } from './deployment';

interface Props {
  visible: boolean;
  namespace: string;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function WorkloadCreateModal({
  visible,
  namespace,
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm<DeploymentCreateValues>();

  const handleSubmit = () => {
    form.validateFields().then(values => onOk(buildDeployment(values)));
  };

  return (
    <Modal
      title={t('CREATE_DEPLOYMENT')}
      width={720}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={handleSubmit}
      onCancel={onCancel}
      bodyStyle={{ padding: '20px' }}
    >
      <Form
        form={form}
        initialValues={{
          namespace,
          replicas: 1,
          imagePullPolicy: 'IfNotPresent',
        }}
      >
        <h3>{t('BASIC_INFORMATION')}</h3>
        <FormItem
          name="name"
          label={t('NAME')}
          rules={[
            { required: true },
            { pattern: DNS_LABEL, message: t('INVALID_NAME_DESC') },
            { max: 253, message: t('INVALID_NAME_DESC') },
          ]}
        >
          <Input autoFocus />
        </FormItem>
        <FormItem name="namespace" label={t('PROJECT')}>
          <Input disabled />
        </FormItem>
        <FormItem name="aliasName" label={t('ALIAS')}>
          <Input maxLength={63} />
        </FormItem>
        <FormItem name="description" label={t('DESCRIPTION')}>
          <Textarea maxLength={256} />
        </FormItem>
        <FormItem name="replicas" label={t('REPLICAS')} rules={[{ required: true }]}>
          <InputNumber min={0} precision={0} />
        </FormItem>

        <h3>{t('POD_SETTINGS')}</h3>
        <FormItem
          name="containerName"
          label={t('CONTAINER_NAME')}
          rules={[
            { required: true },
            { pattern: DNS_LABEL, message: t('INVALID_NAME_DESC') },
            { max: 63, message: t('INVALID_NAME_DESC') },
          ]}
        >
          <Input />
        </FormItem>
        <FormItem name="image" label={t('CONTAINER_IMAGE')} rules={[{ required: true }]}>
          <Input placeholder="nginx:alpine" />
        </FormItem>
        <FormItem name="imagePullPolicy" label={t('IMAGE_PULL_POLICY')}>
          <Select
            options={[
              { label: t('IMAGE_PULL_POLICY_IFNOTPRESENT'), value: 'IfNotPresent' },
              { label: t('IMAGE_PULL_POLICY_ALWAYS'), value: 'Always' },
              { label: t('IMAGE_PULL_POLICY_NEVER'), value: 'Never' },
            ]}
          />
        </FormItem>
      </Form>
    </Modal>
  );
}

export default WorkloadCreateModal;
