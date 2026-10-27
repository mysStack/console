/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useRef, useState } from 'react';
import { Button, Form, FormItem, InputNumber, Modal, useForm, useWatch } from '@kubed/components';
import {
  Check,
  Cogwheel,
  Container,
  Dashboard,
  ForbidRightDuotone,
  Group,
  Storage,
} from '@kubed/icons';
import { ArrayInput } from '@ks-console/shared';
import ContainerSettingsInput from './ContainerSettingsInput';
import WorkloadCardListInput from './WorkloadCardListInput';
import VolumeInput from './VolumeInput';
import PersistentVolumeClaimTemplateInput from './PersistentVolumeClaimTemplateInput';
import WorkloadUpdateStrategyInput from './WorkloadUpdateStrategyInput';
import SecurityContextInput from './SecurityContextInput';
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

export function mergeWorkloadSettingsValues(
  initialValues: WorkloadSettingsValues,
  values: Partial<WorkloadSettingsValues>,
) {
  return { ...initialValues, ...values };
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
  // 图标与 V3 编辑设置左侧导航保持一致。
  const sections = [
    { id: 'updateStrategy', label: 'UPDATE_STRATEGY', Icon: Dashboard },
    { id: 'podTemplate', label: 'CONTAINER_PL', Icon: Container },
    { id: 'volumeSettings', label: 'STORAGE', Icon: Storage },
    ...(kind !== 'DaemonSet'
      ? [{ id: 'podMode', label: 'POD_SCHEDULING_RULES', Icon: Group }]
      : []),
    { id: 'podGracePeriod', label: 'WORKLOAD_TERMINATION_GRACE_PERIOD', Icon: ForbidRightDuotone },
  ];
  const [activeSection, setActiveSection] = useState('updateStrategy');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const volumes = useWatch('volumes', form);
  const volumeClaimTemplates = useWatch('volumeClaimTemplates', form);
  const podSecurityContext = useWatch('podSecurityContext', form);
  const initContainers = useWatch('initContainers', form);
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
    const error = validateWorkloadSettings(
      resource,
      mergeWorkloadSettingsValues(initialValues, form.getFieldsValue()),
    );
    callback(error ? t(error) : undefined);
  };

  const submit = () => {
    form.validateFields().then(
      values =>
        onOk(
          buildDeploymentSettingsResource(
            resource,
            mergeWorkloadSettingsValues(initialValues, values),
          ),
        ),
      () => {},
    );
  };

  return (
    <Modal
      title={t('EDIT_SETTINGS')}
      titleIcon={<Cogwheel size={20} color="#36435c" />}
      width={1162}
      visible={visible}
      centered={false}
      style={{ top: 152 }}
      confirmLoading={confirmLoading}
      onOk={submit}
      onCancel={onCancel}
      bodyStyle={{ padding: '27px 20px 9px' }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', height: 428 }}>
        <nav
          aria-label={t('EDIT_SETTINGS')}
          role="tablist"
          data-test="workload-settings-nav"
          style={{
            width: 172,
            flexShrink: 0,
            marginRight: 12,
          }}
        >
          {sections.map(section => (
            <Button
              key={section.id}
              variant="text"
              aria-current={activeSection === section.id ? 'location' : undefined}
              aria-selected={activeSection === section.id}
              aria-controls={`workload-settings-${section.id}`}
              role="tab"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                height: 38,
                padding: '8px 12px',
                textAlign: 'left',
                marginTop: 4,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${activeSection === section.id ? '#404e68' : 'transparent'}`,
                background: activeSection === section.id ? '#36435c' : 'transparent',
                color: activeSection === section.id ? '#fff' : '#4a5974',
                borderRadius: 18,
              }}
              onClick={() => {
                setActiveSection(section.id);
                sectionRefs.current[section.id]?.scrollIntoView({ block: 'start' });
              }}
            >
              <section.Icon size={20} color={activeSection === section.id ? '#fff' : '#4a5974'} />
              {t(section.label)}
            </Button>
          ))}
        </nav>
        <div
          data-test="workload-settings-panel"
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #e3e9ef',
            borderRadius: 4,
            padding: '12px 12px 38px',
          }}
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
            <section
              id="workload-settings-updateStrategy"
              aria-label={t('UPDATE_STRATEGY')}
              role="tabpanel"
              hidden={activeSection !== 'updateStrategy'}
              ref={node => {
                sectionRefs.current.updateStrategy = node;
              }}
            >
              <div style={{ color: '#36435c', marginBottom: 12 }}>{t('UPDATE_STRATEGY')}</div>
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
              id="workload-settings-podTemplate"
              aria-label={t('CONTAINER_PL')}
              role="tabpanel"
              hidden={activeSection !== 'podTemplate'}
              ref={node => {
                sectionRefs.current.podTemplate = node;
              }}
            >
              <div style={{ color: '#36435c', marginBottom: 12 }}>{t('CONTAINER_PL')}</div>
              <FormItem
                name="containers"
                dependencies={['initContainers', 'volumes']}
                rules={[{ validator: validateContainerFields }]}
              >
                <WorkloadCardListInput
                  adds={[
                    {
                      text: t('WORKLOAD_ADD_CONTAINER'),
                      description: t('ADD_CONTAINER_DESC'),
                      icon: <Container size={24} color="#36435c" />,
                      createValue: () => ({}),
                    },
                  ]}
                >
                  <ContainerSettingsInput
                    kind="CONTAINER"
                    resourceOptions={resources.options}
                    volumeNames={volumeNames}
                  />
                </WorkloadCardListInput>
              </FormItem>
              <div
                style={{
                  marginTop: 12,
                  display: podSecurityContext === undefined ? 'none' : undefined,
                }}
              >
                <FormItem name="podSecurityContext" rules={[{ validator: validateSettings }]}>
                  <SecurityContextInput kind="pod" />
                </FormItem>
              </div>
              <div style={{ display: (initContainers || []).length > 0 ? undefined : 'none' }}>
                <div style={{ color: '#36435c', margin: '16px 0 12px' }}>{t('INIT_CONTAINER')}</div>
                <FormItem
                  name="initContainers"
                  dependencies={['containers', 'volumes']}
                  rules={[{ validator: validateContainerFields }]}
                >
                  <WorkloadCardListInput
                    adds={[
                      {
                        text: t('WORKLOAD_ADD_INIT_CONTAINER'),
                        description: t('ADD_CONTAINER_DESC'),
                        icon: <Container size={24} color="#36435c" />,
                        createValue: () => ({}),
                      },
                    ]}
                  >
                    <ContainerSettingsInput
                      kind="INIT_CONTAINER"
                      resourceOptions={resources.options}
                      volumeNames={volumeNames}
                    />
                  </WorkloadCardListInput>
                </FormItem>
              </div>
            </section>
            <section
              id="workload-settings-volumeSettings"
              aria-label={t('STORAGE')}
              role="tabpanel"
              hidden={activeSection !== 'volumeSettings'}
              ref={node => {
                sectionRefs.current.volumeSettings = node;
              }}
            >
              <div style={{ color: '#36435c', marginBottom: 12 }}>{t('STORAGE_SETTINGS')}</div>
              {resources.isLoading && <div role="status">{t('LOADING')}</div>}
              {resources.isError && <div role="alert">{t('WORKLOAD_RESOURCE_OPTIONS_FAILED')}</div>}
              <FormItem
                name="volumes"
                dependencies={['containers', 'initContainers']}
                rules={[{ validator: validateVolumeFields }]}
              >
                <WorkloadCardListInput
                  adds={[
                    {
                      text: t('MOUNT_VOLUME'),
                      description: t('WORKLOAD_MOUNT_VOLUME_DESC'),
                      createValue: () => ({ name: '', type: 'emptyDir' }),
                    },
                    {
                      text: t('MOUNT_CONFIGMAP_OR_SECRET'),
                      description: t('MOUNT_CONFIGMAP_OR_SECRET_DESC'),
                      createValue: () => ({ name: '', type: 'configMap' }),
                    },
                  ]}
                  checkItemValid={() => true}
                  itemStyle={{
                    padding: '12px 44px 12px 12px',
                    border: '1px solid #e3e9ef',
                    borderRadius: 4,
                    background: '#fff',
                  }}
                >
                  <VolumeInput resourceOptions={resources.options} />
                </WorkloadCardListInput>
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
                id="workload-settings-podMode"
                aria-label={t('POD_SCHEDULING_RULES')}
                role="tabpanel"
                hidden={activeSection !== 'podMode'}
                ref={node => {
                  sectionRefs.current.podMode = node;
                }}
              >
                <div
                  style={{
                    padding: 12,
                    border: '1px solid #e3e9ef',
                    borderRadius: 4,
                    background: '#fff',
                  }}
                >
                  <div style={{ color: '#36435c', fontWeight: 600 }}>
                    {t('POD_SCHEDULING_RULES')}
                  </div>
                  <p
                    style={{
                      color: '#79879c',
                      margin: '4px 0 12px',
                      fontSize: 12,
                      lineHeight: 1.67,
                    }}
                  >
                    {t('POD_SCHEDULING_RULES_DESC')}
                  </p>
                  {workloadTargets.isLoading && <div role="status">{t('LOADING')}</div>}
                  {workloadTargets.isError && (
                    <div role="alert">{t('WORKLOAD_TARGET_OPTIONS_FAILED')}</div>
                  )}
                  <FormItem name="podScheduling" rules={[{ validator: validateSettings }]}>
                    <PodSchedulingInput targets={workloadTargets.options} />
                  </FormItem>
                </div>
              </section>
            )}
            <section
              id="workload-settings-podGracePeriod"
              aria-label={t('WORKLOAD_TERMINATION_GRACE_PERIOD')}
              role="tabpanel"
              hidden={activeSection !== 'podGracePeriod'}
              ref={node => {
                sectionRefs.current.podGracePeriod = node;
              }}
            >
              <details
                data-test="workload-grace-period-card"
                style={{
                  border: '1px solid #e3e9ef',
                  borderRadius: 4,
                  padding: 12,
                  background: '#fff',
                }}
              >
                <summary
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    cursor: 'pointer',
                    listStyle: 'none',
                  }}
                >
                  <Check size={16} color="#36435c" style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: 'block', color: '#36435c', fontWeight: 600 }}>
                      {t('POD_GRACE_PERIOD')}
                    </span>
                    <span
                      style={{ display: 'block', marginTop: 4, color: '#79879c', fontWeight: 400 }}
                    >
                      {t('POD_GRACE_PERIOD_DESC')}
                    </span>
                  </span>
                </summary>
                <div style={{ marginTop: 12 }}>
                  <FormItem
                    name="terminationGracePeriodSeconds"
                    label={t('TERMINATION_GRACEPERIOD_SECONDS')}
                    rules={[{ required: true }, { validator: validateSettings }]}
                  >
                    <InputNumber min={0} precision={0} />
                  </FormItem>
                </div>
              </details>
            </section>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
