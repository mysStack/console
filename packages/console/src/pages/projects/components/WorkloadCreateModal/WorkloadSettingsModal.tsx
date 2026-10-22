/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Form, FormItem, Input, InputNumber, Modal, useForm } from '@kubed/components';
import { ArrayInput } from '@ks-console/shared';
import ContainerInput from './ContainerInput';
import VolumeInput from './VolumeInput';
import useWorkloadResourceOptions from './useWorkloadResourceOptions';
import {
  buildDeploymentSettingsResource,
  DeploymentCreateValues,
  parseDeploymentSettings,
  validateContainers,
  validateVolumes,
  VolumeValues,
} from './deployment';

interface Props {
  visible: boolean;
  cluster: string;
  namespace: string;
  resource: Record<string, any>;
  confirmLoading?: boolean;
  onOk: (resource: Record<string, any>) => void;
  onCancel: () => void;
}

export default function WorkloadSettingsModal({
  visible,
  cluster,
  namespace,
  resource,
  confirmLoading,
  onOk,
  onCancel,
}: Props) {
  const [form] = useForm<DeploymentCreateValues>();
  const resources = useWorkloadResourceOptions(cluster, namespace);
  const initialValues = parseDeploymentSettings(resource);
  const volumeNames = (form.getFieldValue('volumes') || initialValues.volumes || [])
    .map((volume: VolumeValues) => volume.name)
    .filter(Boolean);

  const validateContainerFields = (
    _rule: unknown,
    _value: unknown,
    callback: (error?: string) => void,
  ) => {
    const error = validateContainers(
      form.getFieldValue('containers'),
      form.getFieldValue('initContainers'),
      form.getFieldValue('volumes'),
    );
    callback(error ? t(error) : undefined);
  };

  const validateVolumeFields = (
    _rule: unknown,
    value: DeploymentCreateValues['volumes'],
    callback: (error?: string) => void,
  ) => {
    const error = validateVolumes(value);
    callback(error ? t(error) : undefined);
  };

  const submit = () => {
    form.validateFields().then(
      values => onOk(buildDeploymentSettingsResource(resource, values)),
      () => {},
    );
  };

  return (
    <Modal
      title={t('EDIT_SETTINGS')}
      width={960}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={submit}
      onCancel={onCancel}
      bodyStyle={{ padding: 20, maxHeight: '72vh', overflowY: 'auto' }}
    >
      <Form form={form} initialValues={initialValues}>
        <FormItem name="name" label={t('NAME')}>
          <Input disabled />
        </FormItem>
        <FormItem name="namespace" label={t('PROJECT')}>
          <Input disabled />
        </FormItem>
        <FormItem name="replicas" label={t('REPLICAS')} rules={[{ required: true }]}>
          <InputNumber min={0} precision={0} />
        </FormItem>

        <h3>{t('POD_SETTINGS')}</h3>
        <FormItem
          name="containers"
          label={t('CONTAINERS')}
          dependencies={['initContainers', 'volumes']}
          rules={[{ validator: validateContainerFields }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_CONTAINER')}
            checkItemValid={() => true}
          >
            <ContainerInput
              kind="CONTAINER"
              resourceOptions={resources.options}
              volumeNames={volumeNames}
            />
          </ArrayInput>
        </FormItem>
        <FormItem
          name="initContainers"
          label={t('INIT_CONTAINER')}
          dependencies={['containers', 'volumes']}
          rules={[{ validator: validateContainerFields }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_INIT_CONTAINER')}
            checkItemValid={() => true}
          >
            <ContainerInput
              kind="INIT_CONTAINER"
              resourceOptions={resources.options}
              volumeNames={volumeNames}
            />
          </ArrayInput>
        </FormItem>

        <h3>{t('STORAGE_SETTINGS')}</h3>
        {resources.isLoading && <div role="status">{t('LOADING')}</div>}
        {resources.isError && <div role="alert">{t('WORKLOAD_RESOURCE_OPTIONS_FAILED')}</div>}
        <FormItem
          name="volumes"
          label={t('VOLUME_PL')}
          dependencies={['containers', 'initContainers']}
          rules={[{ validator: validateVolumeFields }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_VOLUME')}
            checkItemValid={() => true}
          >
            <VolumeInput resourceOptions={resources.options} />
          </ArrayInput>
        </FormItem>
      </Form>
    </Modal>
  );
}
