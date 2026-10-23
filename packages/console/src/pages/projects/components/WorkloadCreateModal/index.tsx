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
  Textarea,
  useForm,
  useWatch,
} from '@kubed/components';

import { ArrayInput } from '@ks-console/shared';
import {
  buildDeployment,
  DeploymentCreateValues,
  VolumeValues,
  validateContainers,
  validatePodAnnotations,
  validateSecurityContext,
  validateVolumes,
} from './deployment';
import ContainerInput from './ContainerInput';
import VolumeInput from './VolumeInput';
import useWorkloadResourceOptions from './useWorkloadResourceOptions';
import SecurityContextInput from './SecurityContextInput';
import PodAnnotationsInput from './PodAnnotationsInput';

interface Props {
  visible: boolean;
  cluster: string;
  namespace: string;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function WorkloadCreateModal({
  visible,
  cluster,
  namespace,
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm<DeploymentCreateValues>();
  const volumes = useWatch('volumes', form);
  const resources = useWorkloadResourceOptions(cluster, namespace);

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
      form.getFieldValue('volumes'),
    );
    callback(error ? t(error) : undefined);
  };

  const volumesValidator = (
    _rule: unknown,
    value: DeploymentCreateValues['volumes'],
    callback: (error?: string) => void,
  ) => {
    const error = validateVolumes(value);
    callback(error ? t(error) : undefined);
  };

  const podSecurityContextValidator = (
    _rule: unknown,
    value: DeploymentCreateValues['podSecurityContext'],
    callback: (error?: string) => void,
  ) => {
    const error = validateSecurityContext(value, false)
      ? undefined
      : t('WORKLOAD_SECURITY_CONTEXT_INVALID');
    callback(error);
  };

  const podAnnotationsValidator = (
    _rule: unknown,
    value: DeploymentCreateValues['podAnnotations'],
    callback: (error?: string) => void,
  ) => {
    callback(validatePodAnnotations(value) ? undefined : t('WORKLOAD_ANNOTATIONS_INVALID'));
  };

  const volumeNames = (volumes || []).map((volume: VolumeValues) => volume.name).filter(Boolean);

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
          volumes: [],
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
        <FormItem name="podSecurityContext" rules={[{ validator: podSecurityContextValidator }]}>
          <SecurityContextInput kind="pod" />
        </FormItem>
        <FormItem
          name="containers"
          label={t('CONTAINERS')}
          dependencies={['initContainers', 'volumes']}
          rules={[{ validator: containersValidator }]}
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
          rules={[{ validator: containersValidator }]}
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
          rules={[{ validator: volumesValidator }]}
        >
          <ArrayInput
            itemType="object"
            addText={t('WORKLOAD_ADD_VOLUME')}
            checkItemValid={() => true}
          >
            <VolumeInput resourceOptions={resources.options} />
          </ArrayInput>
        </FormItem>
        <h3>{t('ADD_METADATA')}</h3>
        <FormItem
          name="podAnnotations"
          label={t('ANNOTATION_PL')}
          rules={[{ validator: podAnnotationsValidator }]}
        >
          <PodAnnotationsInput />
        </FormItem>
      </Form>
    </Modal>
  );
}

export default WorkloadCreateModal;
export { default as WorkloadSettingsModal } from './WorkloadSettingsModal';
