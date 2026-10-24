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

import {
  ArrayInput,
  generateId,
  NamespaceSelector,
  PropertiesInput,
  workloadStore,
} from '@ks-console/shared';
import {
  buildDaemonSet,
  buildDeployment,
  buildStatefulSet,
  buildStatefulSetServiceName,
  checkWorkloadLabelsAvailability,
  WorkloadCreateValues,
  WorkloadKind,
  VolumeValues,
  validateContainers,
  validateNodeSelector,
  validatePodAnnotations,
  validatePodScheduling,
  validateSecurityContext,
  validateVolumes,
  validateWorkloadSettings,
  validateWorkloadLabels,
} from './deployment';
import ContainerInput from './ContainerInput';
import VolumeInput from './VolumeInput';
import useWorkloadResourceOptions from './useWorkloadResourceOptions';
import SecurityContextInput from './SecurityContextInput';
import PodAnnotationsInput from './PodAnnotationsInput';
import NodeSelectorInput from './NodeSelectorInput';
import PodSchedulingInput from './PodSchedulingInput';
import useWorkloadTargetOptions from './useWorkloadTargetOptions';
import WorkloadUpdateStrategyInput from './WorkloadUpdateStrategyInput';
import PersistentVolumeClaimTemplateInput from './PersistentVolumeClaimTemplateInput';

interface Props {
  visible: boolean;
  cluster: string;
  namespace: string;
  namespaceSelectable?: boolean;
  kind?: WorkloadKind;
  confirmLoading?: boolean;
  onOk: (data: Record<string, any>) => void;
  onCancel: () => void;
}

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const moduleByKind: Record<WorkloadKind, string> = {
  Deployment: 'deployments',
  StatefulSet: 'statefulsets',
  DaemonSet: 'daemonsets',
};

function WorkloadCreateModal({
  visible,
  cluster,
  namespace,
  namespaceSelectable = false,
  kind = 'Deployment',
  confirmLoading,
  onOk,
  onCancel,
}: Props): JSX.Element {
  const [form] = useForm<WorkloadCreateValues>();
  const watchedNamespace = useWatch('namespace', form) || namespace;
  const volumes = useWatch('volumes', form);
  const volumeClaimTemplates = useWatch('volumeClaimTemplates', form);
  const statefulService = React.useRef({ workloadName: '', serviceName: '' });
  const workload = workloadStore(moduleByKind[kind]);
  const resources = useWorkloadResourceOptions(cluster, watchedNamespace);
  const workloadTargets = useWorkloadTargetOptions(kind, cluster, watchedNamespace);

  const handleSubmit = () => {
    form.validateFields().then(
      values => {
        const selectedNamespace = String(values.namespace || namespace).trim();
        if (kind === 'StatefulSet') {
          const workloadName = String(values.name || '').trim();
          if (statefulService.current.workloadName !== workloadName) {
            statefulService.current = {
              workloadName,
              serviceName: buildStatefulSetServiceName(workloadName, generateId(4)),
            };
          }
          onOk(
            buildStatefulSet(
              { ...values, namespace: selectedNamespace },
              statefulService.current.serviceName,
            ),
          );
          return;
        }
        onOk(
          kind === 'DaemonSet'
            ? buildDaemonSet({ ...values, namespace: selectedNamespace })
            : buildDeployment({ ...values, namespace: selectedNamespace }),
        );
      },
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
      kind === 'StatefulSet'
        ? (form.getFieldValue('volumeClaimTemplates') || [])
            .map((claim: { name?: string }) => claim.name)
            .filter(Boolean)
        : [],
    );
    callback(error ? t(error) : undefined);
  };

  const volumesValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['volumes'],
    callback: (error?: string) => void,
  ) => {
    const error = validateVolumes(value);
    callback(error ? t(error) : undefined);
  };

  const podSecurityContextValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['podSecurityContext'],
    callback: (error?: string) => void,
  ) => {
    const error = validateSecurityContext(value, false)
      ? undefined
      : t('WORKLOAD_SECURITY_CONTEXT_INVALID');
    callback(error);
  };

  const podAnnotationsValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['podAnnotations'],
    callback: (error?: string) => void,
  ) => {
    callback(validatePodAnnotations(value) ? undefined : t('WORKLOAD_ANNOTATIONS_INVALID'));
  };

  const workloadAnnotationsValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['workloadAnnotations'],
    callback: (error?: string) => void,
  ) => {
    callback(validatePodAnnotations(value) ? undefined : t('WORKLOAD_ANNOTATIONS_INVALID'));
  };

  const workloadLabelsValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['workloadLabels'],
    callback: (error?: string) => void,
  ) => {
    if (!validateWorkloadLabels(value)) {
      callback(t('WORKLOAD_LABELS_INVALID'));
      return;
    }
    const name = String(form.getFieldValue('name') || '').trim();
    if (!watchedNamespace || !name || name.length > 253 || !DNS_LABEL.test(name)) {
      callback();
      return;
    }
    checkWorkloadLabelsAvailability(workload.checkLabels, {
      cluster,
      namespace: watchedNamespace,
      name,
      labels: value,
    }).then(error => callback(error ? t(error) : undefined));
  };

  const podSchedulingValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['podScheduling'],
    callback: (error?: string) => void,
  ) => {
    callback(validatePodScheduling(value) ? undefined : t('WORKLOAD_SCHEDULING_INVALID'));
  };

  const nodeSelectorValidator = (
    _rule: unknown,
    value: WorkloadCreateValues['nodeSelector'],
    callback: (error?: string) => void,
  ) => {
    callback(validateNodeSelector(value) ? undefined : t('WORKLOAD_NODE_SELECTOR_INVALID'));
  };

  const volumeNames = [
    ...(volumes || []).map((volume: VolumeValues) => volume.name),
    ...(kind === 'StatefulSet'
      ? (volumeClaimTemplates || []).map((claim: { name?: string }) => claim.name)
      : []),
  ].filter((name): name is string => Boolean(name));

  const workloadSettingsValidator = (
    _rule: unknown,
    _value: unknown,
    callback: (error?: string) => void,
  ) => {
    const error = validateWorkloadSettings({ kind, spec: {} }, form.getFieldsValue());
    callback(error ? t(error) : undefined);
  };

  return (
    <Modal
      title={t(
        kind === 'DaemonSet'
          ? 'CREATE_DAEMONSET'
          : kind === 'StatefulSet'
            ? 'CREATE_STATEFULSET'
            : 'CREATE_DEPLOYMENT',
      )}
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
          updateStrategy:
            kind === 'DaemonSet'
              ? { type: 'RollingUpdate', maxUnavailable: '20%' }
              : kind === 'StatefulSet'
                ? { type: 'RollingUpdate', partition: 0 }
                : { type: 'RollingUpdate', maxUnavailable: '25%', maxSurge: '25%' },
          minReadySeconds: 0,
          terminationGracePeriodSeconds: 30,
          containers: [{ name: '', image: '', imagePullPolicy: 'IfNotPresent' }],
          initContainers: [],
          volumes: [],
          volumeClaimTemplates: [],
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
        <FormItem
          name="namespace"
          label={t('PROJECT')}
          rules={[{ required: true, message: t('PROJECT_EMPTY_DESC') }]}
        >
          {namespaceSelectable ? (
            <NamespaceSelector cluster={cluster} style={{ width: '100%' }} />
          ) : (
            <Input disabled />
          )}
        </FormItem>
        <FormItem name="aliasName" label={t('ALIAS')}>
          <Input maxLength={63} />
        </FormItem>
        <FormItem name="description" label={t('DESCRIPTION')}>
          <Textarea maxLength={256} />
        </FormItem>
        {kind !== 'DaemonSet' && (
          <FormItem name="replicas" label={t('REPLICAS')} rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} />
          </FormItem>
        )}

        {kind !== 'Deployment' && (
          <>
            <h3>{t('UPDATE_STRATEGY')}</h3>
            <FormItem name="updateStrategy" rules={[{ validator: workloadSettingsValidator }]}>
              <WorkloadUpdateStrategyInput kind={kind} />
            </FormItem>
            {kind === 'DaemonSet' && (
              <FormItem
                name="minReadySeconds"
                label={t('MIN_READY_SECONDS')}
                rules={[{ required: true }, { validator: workloadSettingsValidator }]}
              >
                <InputNumber min={0} precision={0} />
              </FormItem>
            )}
          </>
        )}

        <h3>{t('POD_SETTINGS')}</h3>
        <FormItem name="podSecurityContext" rules={[{ validator: podSecurityContextValidator }]}>
          <SecurityContextInput kind="pod" />
        </FormItem>
        {kind !== 'DaemonSet' && (
          <>
            <h3>{t('POD_SCHEDULING_RULES')}</h3>
            {workloadTargets.isLoading && <div role="status">{t('LOADING')}</div>}
            {workloadTargets.isError && (
              <div role="alert">{t('WORKLOAD_TARGET_OPTIONS_FAILED')}</div>
            )}
            <FormItem name="podScheduling" rules={[{ validator: podSchedulingValidator }]}>
              <PodSchedulingInput targets={workloadTargets.options} />
            </FormItem>
          </>
        )}
        <FormItem
          name="nodeSelector"
          label={t('SELECT_NODES')}
          rules={[{ validator: nodeSelectorValidator }]}
        >
          <NodeSelectorInput />
        </FormItem>
        <FormItem
          name="containers"
          label={t('CONTAINERS')}
          dependencies={['initContainers', 'volumes', 'volumeClaimTemplates']}
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
              withService={kind === 'StatefulSet'}
            />
          </ArrayInput>
        </FormItem>
        <FormItem
          name="initContainers"
          label={t('INIT_CONTAINER')}
          dependencies={['containers', 'volumes', 'volumeClaimTemplates']}
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
        {kind === 'StatefulSet' && (
          <FormItem
            name="volumeClaimTemplates"
            label={t('PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL')}
            dependencies={['containers', 'initContainers']}
            rules={[{ validator: workloadSettingsValidator }]}
          >
            <ArrayInput
              itemType="object"
              addText={t('WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE')}
              checkItemValid={() => true}
            >
              <PersistentVolumeClaimTemplateInput />
            </ArrayInput>
          </FormItem>
        )}
        {kind !== 'Deployment' && (
          <>
            <h3>{t('WORKLOAD_TERMINATION_GRACE_PERIOD')}</h3>
            <FormItem
              name="terminationGracePeriodSeconds"
              label={t('WORKLOAD_TERMINATION_GRACE_SECONDS')}
              rules={[{ required: true }, { validator: workloadSettingsValidator }]}
            >
              <InputNumber min={0} precision={0} />
            </FormItem>
          </>
        )}
        <h3>{t('ADD_METADATA')}</h3>
        <FormItem
          name="workloadLabels"
          label={t('LABEL_PL')}
          dependencies={['name', 'namespace']}
          rules={[{ validator: workloadLabelsValidator }]}
        >
          <PropertiesInput addText={t('ADD')} />
        </FormItem>
        <FormItem
          name="workloadAnnotations"
          label={t('ANNOTATION_PL')}
          rules={[{ validator: workloadAnnotationsValidator }]}
        >
          <PodAnnotationsInput />
        </FormItem>
        <h3>{t('POD_TEMPLATE_METADATA')}</h3>
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
