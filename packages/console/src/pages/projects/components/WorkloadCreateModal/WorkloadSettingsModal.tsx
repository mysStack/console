/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useRef, useState } from 'react';
import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  useForm,
  useWatch,
} from '@kubed/components';
import { ArrayInput, PropertiesInput } from '@ks-console/shared';
import ContainerSettingsInput from './ContainerSettingsInput';
import VolumeInput from './VolumeInput';
import PersistentVolumeClaimTemplateInput from './PersistentVolumeClaimTemplateInput';
import WorkloadUpdateStrategyInput from './WorkloadUpdateStrategyInput';
import SecurityContextInput from './SecurityContextInput';
import PodAnnotationsInput from './PodAnnotationsInput';
import PodSchedulingInput from './PodSchedulingInput';
import useWorkloadResourceOptions from './useWorkloadResourceOptions';
import useWorkloadTargetOptions from './useWorkloadTargetOptions';
import {
  buildDeploymentSettingsResource,
  WorkloadSettingsValues,
  WorkloadKind,
  parseDeploymentSettings,
  validateContainers,
  validateVolumes,
  validateVolumeClaimTemplates,
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
  const sections = [
    { id: 'updateStrategy', label: 'UPDATE_STRATEGY' },
    { id: 'podTemplate', label: 'POD_SETTINGS' },
    { id: 'volumeSettings', label: 'STORAGE_SETTINGS' },
    ...(kind !== 'DaemonSet' ? [{ id: 'podMode', label: 'POD_SCHEDULING_RULES' }] : []),
    { id: 'podGracePeriod', label: 'WORKLOAD_TERMINATION_GRACE_PERIOD' },
    { id: 'metadata', label: 'ADD_METADATA' },
  ];
  const [activeSection, setActiveSection] = useState('updateStrategy');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const volumes = useWatch('volumes', form);
  const volumeClaimTemplates = useWatch('volumeClaimTemplates', form);
  const resources = useWorkloadResourceOptions(cluster, namespace);
  const workloadTargets = useWorkloadTargetOptions(kind, cluster, namespace);
  const initialValues = parseDeploymentSettings(resource);
  // StatefulSet PVC 模板由控制器按 Pod 创建卷，不存在于 template.spec.volumes。
  const claimTemplateNames: string[] =
    kind === 'StatefulSet'
      ? (volumeClaimTemplates || initialValues.volumeClaimTemplates || [])
          .map(claim => claim.name)
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

  const validateVolumeClaimTemplateFields = (
    _rule: unknown,
    value: WorkloadSettingsValues['volumeClaimTemplates'],
    callback: (error?: string) => void,
  ) => {
    const error = validateVolumeClaimTemplates(value);
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
      bodyStyle={{ padding: 20 }}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <nav aria-label={t('EDIT_SETTINGS')} style={{ width: 160, flexShrink: 0 }}>
          {sections.map(section => (
            <Button
              key={section.id}
              variant="text"
              aria-current={activeSection === section.id ? 'location' : undefined}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                marginBottom: 8,
                fontWeight: activeSection === section.id ? 600 : 400,
              }}
              onClick={() => {
                setActiveSection(section.id);
                sectionRefs.current[section.id]?.scrollIntoView({ block: 'start' });
              }}
            >
              {t(section.label)}
            </Button>
          ))}
        </nav>
        <div style={{ flex: 1, minWidth: 0, maxHeight: '68vh', overflowY: 'auto' }}>
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

            <section
              aria-label={t('UPDATE_STRATEGY')}
              ref={node => {
                sectionRefs.current.updateStrategy = node;
              }}
            >
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
            </section>
            <section
              aria-label={t('POD_SETTINGS')}
              ref={node => {
                sectionRefs.current.podTemplate = node;
              }}
            >
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
                  <ContainerSettingsInput
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
                  <ContainerSettingsInput
                    kind="INIT_CONTAINER"
                    resourceOptions={resources.options}
                    volumeNames={volumeNames}
                  />
                </ArrayInput>
              </FormItem>
            </section>
            <section
              aria-label={t('STORAGE_SETTINGS')}
              ref={node => {
                sectionRefs.current.volumeSettings = node;
              }}
            >
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
              {kind === 'StatefulSet' && (
                <FormItem
                  name="volumeClaimTemplates"
                  label={t('PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL')}
                  rules={[{ validator: validateVolumeClaimTemplateFields }]}
                >
                  <ArrayInput
                    itemType="object"
                    addText={t('WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE')}
                    checkItemValid={(
                      item: NonNullable<WorkloadSettingsValues['volumeClaimTemplates']>[number],
                    ) => Boolean(item?.name && item?.storage && item?.accessModes?.length)}
                  >
                    <PersistentVolumeClaimTemplateInput />
                  </ArrayInput>
                </FormItem>
              )}
            </section>
            {kind !== 'DaemonSet' && (
              <section
                aria-label={t('POD_SCHEDULING_RULES')}
                ref={node => {
                  sectionRefs.current.podMode = node;
                }}
              >
                <h3>{t('POD_SCHEDULING_RULES')}</h3>
                {workloadTargets.isLoading && <div role="status">{t('LOADING')}</div>}
                {workloadTargets.isError && (
                  <div role="alert">{t('WORKLOAD_TARGET_OPTIONS_FAILED')}</div>
                )}
                <FormItem name="podScheduling" rules={[{ validator: validateSettings }]}>
                  <PodSchedulingInput targets={workloadTargets.options} />
                </FormItem>
              </section>
            )}
            <section
              aria-label={t('WORKLOAD_TERMINATION_GRACE_PERIOD')}
              ref={node => {
                sectionRefs.current.podGracePeriod = node;
              }}
            >
              <h3>{t('WORKLOAD_TERMINATION_GRACE_PERIOD')}</h3>
              <FormItem
                name="terminationGracePeriodSeconds"
                label={t('WORKLOAD_TERMINATION_GRACE_SECONDS')}
                rules={[{ required: true }, { validator: validateSettings }]}
              >
                <InputNumber min={0} precision={0} />
              </FormItem>
            </section>
            <section
              aria-label={t('ADD_METADATA')}
              ref={node => {
                sectionRefs.current.metadata = node;
              }}
            >
              <h3>{t('ADD_METADATA')}</h3>
              <FormItem
                name="workloadLabels"
                label={t('LABEL_PL')}
                rules={[{ validator: validateSettings }]}
              >
                <PropertiesInput hiddenKeys={['app']} addText={t('ADD')} />
              </FormItem>
              <FormItem
                name="workloadAnnotations"
                label={t('ANNOTATION_PL')}
                rules={[{ validator: validateSettings }]}
              >
                <PodAnnotationsInput />
              </FormItem>
              <h3>{t('POD_TEMPLATE_METADATA')}</h3>
              <FormItem
                name="podAnnotations"
                label={t('ANNOTATION_PL')}
                rules={[{ validator: validateSettings }]}
              >
                <PodAnnotationsInput />
              </FormItem>
            </section>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
