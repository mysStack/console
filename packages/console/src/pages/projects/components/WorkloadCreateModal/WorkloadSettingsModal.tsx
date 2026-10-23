/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Form, FormItem, Input, InputNumber, Modal, useForm, useWatch } from '@kubed/components';
import { ArrayInput } from '@ks-console/shared';
import ContainerInput from './ContainerInput';
import VolumeInput from './VolumeInput';
import WorkloadUpdateStrategyInput from './WorkloadUpdateStrategyInput';
import SecurityContextInput from './SecurityContextInput';
import PodAnnotationsInput from './PodAnnotationsInput';
import useWorkloadResourceOptions from './useWorkloadResourceOptions';
import {
  buildDeploymentSettingsResource,
  WorkloadSettingsValues,
  WorkloadKind,
  parseDeploymentSettings,
  validateContainers,
  validateVolumes,
  validateWorkloadSettings,
  VolumeValues,
} from './deployment';

interface Props {
  visible: boolean;
  cluster: string;
  namespace: string;
  resource: Record<string, any>;
  confirmLoading?: boolean;
  error?: unknown;
  onOk: (resource: Record<string, any>) => void;
  onCancel: () => void;
}

export default function WorkloadSettingsModal({
  visible,
  cluster,
  namespace,
  resource,
  confirmLoading,
  error: saveError,
  onOk,
  onCancel,
}: Props) {
  const [form] = useForm<WorkloadSettingsValues>();
  const kind: WorkloadKind = resource.kind || 'Deployment';
  const volumes = useWatch('volumes', form);
  const resources = useWorkloadResourceOptions(cluster, namespace);
  const initialValues = parseDeploymentSettings(resource);
  // StatefulSet PVC 模板由控制器按 Pod 创建卷，不存在于 template.spec.volumes。
  const claimTemplateNames: string[] =
    kind === 'StatefulSet'
      ? (resource.spec?.volumeClaimTemplates || [])
          .map((claim: Record<string, any>) => claim.metadata?.name)
          .filter(Boolean)
      : [];
  const volumeNames = [
    ...(volumes || initialValues.volumes || [])
      .map((volume: VolumeValues) => volume.name)
      .filter(Boolean),
    ...claimTemplateNames,
  ];

  const validateContainerFields = (
    _rule: unknown,
    _value: unknown,
    callback: (error?: string) => void,
  ) => {
    const error = validateContainers(
      form.getFieldValue('containers'),
      form.getFieldValue('initContainers'),
      form.getFieldValue('volumes'),
      claimTemplateNames,
    );
    callback(error ? t(error) : undefined);
  };

  const validateVolumeFields = (
    _rule: unknown,
    value: WorkloadSettingsValues['volumes'],
    callback: (error?: string) => void,
  ) => {
    const error = validateVolumes(value);
    callback(error ? t(error) : undefined);
  };

  const validateSettings = (
    _rule: unknown,
    _value: unknown,
    callback: (error?: string) => void,
  ) => {
    const error = validateWorkloadSettings(resource, form.getFieldsValue());
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
        {!!saveError && (
          <div
            role="alert"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: '#fff',
              color: '#ca2621',
              padding: 12,
              marginBottom: 16,
            }}
          >
            {t(
              (saveError as { response?: { status?: number } }).response?.status === 409
                ? 'WORKLOAD_SETTINGS_CONFLICT'
                : 'WORKLOAD_SETTINGS_SAVE_FAILED',
            )}
          </div>
        )}
        <FormItem name="name" label={t('NAME')}>
          <Input disabled />
        </FormItem>
        <FormItem name="namespace" label={t('PROJECT')}>
          <Input disabled />
        </FormItem>
        {kind !== 'DaemonSet' && (
          <FormItem
            name="replicas"
            label={t('REPLICAS')}
            rules={[{ required: true }, { validator: validateSettings }]}
          >
            <InputNumber min={0} precision={0} />
          </FormItem>
        )}

        <h3>{t('UPDATE_STRATEGY')}</h3>
        <FormItem name="updateStrategy" rules={[{ validator: validateSettings }]}>
          <WorkloadUpdateStrategyInput kind={kind} />
        </FormItem>
        {kind === 'DaemonSet' && (
          <FormItem
            name="minReadySeconds"
            label={t('MIN_READY_SECONDS')}
            rules={[{ required: true }, { validator: validateSettings }]}
          >
            <InputNumber min={0} precision={0} />
          </FormItem>
        )}

        <h3>{t('POD_SETTINGS')}</h3>
        <FormItem name="podSecurityContext" rules={[{ validator: validateSettings }]}>
          <SecurityContextInput kind="pod" />
        </FormItem>
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
        <h3>{t('WORKLOAD_TERMINATION_GRACE_PERIOD')}</h3>
        <FormItem
          name="terminationGracePeriodSeconds"
          label={t('WORKLOAD_TERMINATION_GRACE_SECONDS')}
          rules={[{ required: true }, { validator: validateSettings }]}
        >
          <InputNumber min={0} precision={0} />
        </FormItem>
        <h3>{t('ADD_METADATA')}</h3>
        <FormItem
          name="podAnnotations"
          label={t('ANNOTATION_PL')}
          rules={[{ validator: validateSettings }]}
        >
          <PodAnnotationsInput />
        </FormItem>
      </Form>
    </Modal>
  );
}
