/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Form, FormItem, Input, Modal, InputNumber, Textarea, useForm } from '@kubed/components';

import { ArrayInput } from '@ks-console/shared';
import { buildDeployment, DeploymentCreateValues, validateContainers } from './deployment';
import ContainerInput from './ContainerInput';

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
    form.validateFields().then(
      values => onOk(buildDeployment({ ...values, namespace })),
      () => {},
    );
  };

  const containersValidator = (
    _rule: unknown,
    _value: unknown,
    callback: (error?: string) => void,
  ) => {
    const error = validateContainers(
      form.getFieldValue('containers'),
      form.getFieldValue('initContainers'),
    );
    callback(error ? t(error) : undefined);
  };

  return (
    <Modal
      title={t('CREATE_DEPLOYMENT')}
      width={900}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={handleSubmit}
      onCancel={onCancel}
      bodyStyle={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}
    >
      <Form
        form={form}
        initialValues={{
          namespace,
          replicas: 1,
          containers: [{ name: '', image: '', imagePullPolicy: 'IfNotPresent' }],
          initContainers: [],
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
          name="containers"
          label={t('CONTAINERS')}
          rules={[{ validator: containersValidator }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_CONTAINER')}
            checkItemValid={() => true}
          >
            <ContainerInput kind="CONTAINER" />
          </ArrayInput>
        </FormItem>
        <FormItem
          name="initContainers"
          label={t('INIT_CONTAINER')}
          rules={[{ validator: containersValidator }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_INIT_CONTAINER')}
            checkItemValid={() => true}
          >
            <ContainerInput kind="INIT_CONTAINER" />
          </ArrayInput>
        </FormItem>
      </Form>
    </Modal>
  );
}

export default WorkloadCreateModal;
