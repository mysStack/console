/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import styled from 'styled-components';
import { Input, InputNumber, Select, Switch } from '@kubed/components';
import { ArrayInput } from '@ks-console/shared';
import {
  ContainerCreateValues,
  ContainerPortValues,
  EnvironmentFromValues,
  EnvironmentValues,
  ProbeValues,
  VolumeMountValues,
} from './deployment';
import SecurityContextInput from './SecurityContextInput';

export interface WorkloadResourceOptions {
  configMaps: string[];
  secrets: string[];
  imagePullSecrets?: string[];
  persistentVolumeClaims: string[];
}

const ContainerField = styled.label`
  display: block;
  margin-bottom: 12px;

  & > span:first-child {
    display: block;
    margin-bottom: 4px;
  }
`;

function parseCommaSeparated(value: string): string[] {
  return value ? value.split(',') : [];
}

function stringifyCommaSeparated(value: string[] = []): string {
  return value.join(',');
}

function PortInput({
  value = {},
  onChange,
  withService = false,
}: {
  value?: ContainerPortValues;
  onChange?: (value: ContainerPortValues) => void;
  withService?: boolean;
}) {
  const applicationProtocol =
    value.applicationProtocol ||
    (value.protocol === 'UDP' || value.protocol === 'SCTP' ? value.protocol : 'TCP');
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <Input
        style={{ flex: '1 1 0', minWidth: 0 }}
        aria-label={t('NAME')}
        placeholder={t('NAME')}
        value={value.name || ''}
        onChange={event => onChange?.({ ...value, name: event.target.value })}
      />
      <InputNumber
        style={{ width: 120, flex: '0 0 120px' }}
        aria-label={t('CONTAINER_PORT')}
        placeholder={t('CONTAINER_PORT')}
        min={1}
        max={65535}
        precision={0}
        value={value.containerPort}
        onChange={containerPort =>
          onChange?.({
            ...value,
            containerPort:
              containerPort == null || containerPort === '' ? undefined : Number(containerPort),
          })
        }
      />
      {withService && (
        <InputNumber
          style={{ width: 120, flex: '0 0 120px' }}
          aria-label={t('SERVICE_PORT')}
          placeholder={t('SERVICE_PORT')}
          min={1}
          max={65535}
          precision={0}
          value={value.servicePort}
          onChange={servicePort =>
            onChange?.({
              ...value,
              servicePort:
                servicePort == null || servicePort === '' ? undefined : Number(servicePort),
            })
          }
        />
      )}
      <Select
        style={{ width: 120, flex: '0 0 120px' }}
        aria-label={t('PROTOCOL')}
        value={applicationProtocol}
        options={['GRPC', 'HTTP', 'HTTP2', 'HTTPS', 'TCP', 'UDP', 'SCTP'].map(protocol => ({
          label: protocol,
          value: protocol,
        }))}
        onChange={protocol =>
          onChange?.({
            ...value,
            applicationProtocol: protocol,
            protocol: ['UDP', 'SCTP'].includes(protocol) ? protocol : 'TCP',
          })
        }
      />
    </div>
  );
}

function EnvironmentInput({
  value = { name: '' },
  onChange,
}: {
  value?: EnvironmentValues;
  onChange?: (value: EnvironmentValues) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <Input
        aria-label={t('NAME')}
        placeholder={t('NAME')}
        value={value.name || ''}
        onChange={event => onChange?.({ ...value, name: event.target.value })}
      />
      <Input
        aria-label={t('VALUE')}
        placeholder={t('VALUE')}
        value={value.value || ''}
        onChange={event => onChange?.({ ...value, value: event.target.value })}
      />
    </div>
  );
}

const toOptions = (items: string[]) => items.map(item => ({ label: item, value: item }));

function EnvironmentFromInput({
  value = { kind: 'configMap', name: '' },
  onChange,
  resourceOptions,
}: {
  value?: EnvironmentFromValues;
  onChange?: (value: EnvironmentFromValues) => void;
  resourceOptions: WorkloadResourceOptions;
}) {
  const names = value.kind === 'secret' ? resourceOptions.secrets : resourceOptions.configMaps;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px', gap: 8, width: '100%' }}>
      <Select
        aria-label={t('WORKLOAD_REFERENCE_TYPE')}
        value={value.kind}
        options={[
          { label: 'ConfigMap', value: 'configMap' },
          { label: 'Secret', value: 'secret' },
        ]}
        onChange={kind => onChange?.({ ...value, kind, name: '' })}
      />
      <Select
        aria-label={t('WORKLOAD_REFERENCE_RESOURCE')}
        value={value.name || ''}
        options={toOptions(names)}
        placeholder={t('WORKLOAD_SELECT_RESOURCE')}
        onChange={name => onChange?.({ ...value, name: String(name) })}
      />
      <Input
        aria-label={t('PREFIX')}
        placeholder={t('PREFIX')}
        value={value.prefix || ''}
        onChange={event => onChange?.({ ...value, prefix: event.target.value })}
      />
    </div>
  );
}

function ProbeInput({
  label,
  value,
  onChange,
  handlerOnly = false,
}: {
  label: string;
  value?: ProbeValues;
  onChange: (value?: ProbeValues) => void;
  handlerOnly?: boolean;
}) {
  const enabled = Boolean(value);
  const update = (patch: Partial<ProbeValues>) =>
    onChange({ type: 'http', path: '/', port: 80, ...value, ...patch });
  return (
    <div style={{ borderTop: '1px solid #e3e9ef', paddingTop: 12, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>{label}</strong>
        <Switch
          aria-label={`${label} ${t('ENABLE')}`}
          checked={enabled}
          onChange={checked =>
            onChange(
              checked
                ? handlerOnly
                  ? { type: 'http', path: '/', port: 80 }
                  : {
                      type: 'http',
                      path: '/',
                      port: 80,
                      initialDelaySeconds: 0,
                      timeoutSeconds: 1,
                      periodSeconds: 10,
                      successThreshold: 1,
                      failureThreshold: 3,
                    }
                : undefined,
            )
          }
        />
      </div>
      {value && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 120px',
              gap: 8,
              marginTop: 8,
            }}
          >
            <Select
              aria-label={`${label} ${t('TYPE')}`}
              value={value.type}
              options={[
                { label: 'HTTP', value: 'http' },
                { label: 'TCP', value: 'tcp' },
                { label: t('COMMAND'), value: 'command' },
              ]}
              onChange={type =>
                onChange(
                  type === 'command'
                    ? { ...value, type, command: value.command || [] }
                    : {
                        ...value,
                        type,
                        path: type === 'http' ? value.path || '/' : undefined,
                        port: value.port || 80,
                      },
                )
              }
            />
            {value.type === 'command' ? (
              handlerOnly ? (
                <ArrayInput
                  value={value.command || []}
                  addText={t('ADD')}
                  checkItemValid={() => true}
                  onChange={command => update({ command })}
                >
                  <Input aria-label={`${label} ${t('COMMAND')}`} />
                </ArrayInput>
              ) : (
                <Input
                  aria-label={`${label} ${t('COMMAND')}`}
                  value={stringifyCommaSeparated(value.command)}
                  placeholder="cat,/tmp/ready"
                  onChange={event => update({ command: parseCommaSeparated(event.target.value) })}
                />
              )
            ) : value.type === 'http' ? (
              <Input
                aria-label={`${label} ${t('PATH')}`}
                value={value.path || ''}
                placeholder="/healthz"
                onChange={event => update({ path: event.target.value })}
              />
            ) : (
              <span />
            )}
            {value.type !== 'command' && (
              <Input
                aria-label={`${label} ${t('PORT')}`}
                value={value.port}
                onChange={event => {
                  const port = event.target.value;
                  update({ port: /^\d+$/.test(port) ? Number(port) : port });
                }}
              />
            )}
          </div>
          {value.type === 'http' && (
            <Select
              aria-label={`${label} ${t('PROTOCOL')}`}
              value={value.scheme || 'HTTP'}
              options={['HTTP', 'HTTPS'].map(scheme => ({ label: scheme, value: scheme }))}
              onChange={scheme => update({ scheme })}
            />
          )}
          {!handlerOnly && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
                marginTop: 8,
              }}
            >
              {(
                [
                  ['initialDelaySeconds', 'WORKLOAD_INITIAL_DELAY'],
                  ['timeoutSeconds', 'WORKLOAD_TIMEOUT'],
                  ['periodSeconds', 'WORKLOAD_PERIOD'],
                  ['successThreshold', 'WORKLOAD_SUCCESS_THRESHOLD'],
                  ['failureThreshold', 'WORKLOAD_FAILURE_THRESHOLD'],
                ] as const
              ).map(([field, text]) => (
                <ContainerField key={field}>
                  <span>{t(text)}</span>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={field === 'initialDelaySeconds' ? 0 : 1}
                    precision={0}
                    value={value[field]}
                    onChange={number =>
                      update({ [field]: number == null ? undefined : Number(number) })
                    }
                  />
                </ContainerField>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VolumeMountInput({
  value = { name: '', mountPath: '' },
  onChange,
  volumeNames,
}: {
  value?: VolumeMountValues;
  onChange?: (value: VolumeMountValues) => void;
  volumeNames: string[];
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 150px 90px',
        gap: 8,
        width: '100%',
      }}
    >
      <Select
        aria-label={t('VOLUME')}
        value={value.name || ''}
        options={toOptions(volumeNames)}
        onChange={name => onChange?.({ ...value, name: String(name) })}
      />
      <Input
        aria-label={t('MOUNT_PATH')}
        placeholder="/data"
        value={value.mountPath || ''}
        onChange={event => onChange?.({ ...value, mountPath: event.target.value })}
      />
      <Input
        aria-label="subPath"
        placeholder="subPath"
        value={value.subPath || ''}
        onChange={event => onChange?.({ ...value, subPath: event.target.value })}
      />
      <Switch
        label={t('READ_ONLY')}
        checked={Boolean(value.readOnly)}
        onChange={readOnly => onChange?.({ ...value, readOnly })}
      />
    </div>
  );
}

interface Props {
  value?: ContainerCreateValues;
  onChange?: (value: ContainerCreateValues) => void;
  index?: number;
  kind: 'CONTAINER' | 'INIT_CONTAINER';
  resourceOptions?: WorkloadResourceOptions;
  volumeNames?: string[];
  withService?: boolean;
}

export default function ContainerInput({
  value = { name: '', image: '' },
  onChange,
  index = 0,
  kind,
  resourceOptions = {
    configMaps: [],
    secrets: [],
    imagePullSecrets: [],
    persistentVolumeClaims: [],
  },
  volumeNames = [],
  withService = false,
}: Props) {
  const gpuTypes: string[] =
    typeof globals === 'undefined' ? [] : globals.config.supportGpuType || [];
  const update = (patch: Partial<ContainerCreateValues>) => onChange?.({ ...value, ...patch });
  return (
    <div role="group" aria-label={`${t(kind)} ${index + 1}`} style={{ width: '100%', minWidth: 0 }}>
      <h4>
        {t(kind)} {index + 1}
      </h4>
      <ContainerField>
        <span>{t('CONTAINER_NAME')}</span>
        <Input
          style={{ width: '100%', maxWidth: 'none' }}
          aria-label={t('CONTAINER_NAME')}
          value={value.name || ''}
          maxLength={63}
          onChange={event => update({ name: event.target.value })}
        />
      </ContainerField>
      <ContainerField>
        <span>{t('IMAGE_REGISTRY_INFORMATION')}</span>
        <Select
          style={{ width: '100%' }}
          aria-label={t('IMAGE_REGISTRY_INFORMATION')}
          value={value.pullSecret || ''}
          options={[
            { label: t('NONE'), value: '' },
            ...toOptions(resourceOptions.imagePullSecrets || []),
          ]}
          onChange={pullSecret => update({ pullSecret: String(pullSecret || '') })}
        />
      </ContainerField>
      <ContainerField>
        <span>{t('CONTAINER_IMAGE')}</span>
        <Input
          style={{ width: '100%', maxWidth: 'none' }}
          aria-label={t('CONTAINER_IMAGE')}
          value={value.image || ''}
          placeholder="nginx:alpine"
          onChange={event => update({ image: event.target.value })}
        />
      </ContainerField>
      <ContainerField>
        <span>{t('IMAGE_PULL_POLICY')}</span>
        <Select
          style={{ width: '100%' }}
          aria-label={t('IMAGE_PULL_POLICY')}
          value={value.imagePullPolicy || 'IfNotPresent'}
          options={[
            { label: t('IMAGE_PULL_POLICY_IFNOTPRESENT'), value: 'IfNotPresent' },
            { label: t('IMAGE_PULL_POLICY_ALWAYS'), value: 'Always' },
            { label: t('IMAGE_PULL_POLICY_NEVER'), value: 'Never' },
          ]}
          onChange={imagePullPolicy => update({ imagePullPolicy })}
        />
      </ContainerField>
      <div role="group" aria-label={t('STARTUP_COMMAND')}>
        <h4>{t('STARTUP_COMMAND')}</h4>
        <ContainerField>
          <span>{t('COMMAND')}</span>
          <Input
            style={{ width: '100%', maxWidth: 'none' }}
            aria-label={t('COMMAND')}
            value={stringifyCommaSeparated(value.command)}
            placeholder="/bin/sh"
            onChange={event => update({ command: parseCommaSeparated(event.target.value) })}
          />
        </ContainerField>
        <ContainerField>
          <span>{t('PARAMETERS')}</span>
          <Input
            style={{ width: '100%', maxWidth: 'none' }}
            aria-label={t('PARAMETERS')}
            value={stringifyCommaSeparated(value.args)}
            placeholder="-c,sleep 3600"
            onChange={event => update({ args: parseCommaSeparated(event.target.value) })}
          />
        </ContainerField>
      </div>
      <div role="group" aria-label={t('PORT_SETTINGS')}>
        <h4>{t('PORT_SETTINGS')}</h4>
        <ArrayInput
          itemType="object"
          value={value.ports || []}
          addText={t('ADD_PORT')}
          checkItemValid={() => true}
          onChange={ports => update({ ports })}
        >
          <PortInput withService={withService} />
        </ArrayInput>
      </div>
      <div role="group" aria-label={t('ENVIRONMENT_VARIABLE_PL')}>
        <h4>{t('ENVIRONMENT_VARIABLE_PL')}</h4>
        <ArrayInput
          itemType="object"
          value={value.env || []}
          addText={t('WORKLOAD_ADD_ENV')}
          checkItemValid={() => true}
          onChange={env => update({ env })}
        >
          <EnvironmentInput />
        </ArrayInput>
        <ArrayInput
          itemType="object"
          value={value.envFrom || []}
          addText={t('WORKLOAD_ADD_CONFIG_REFERENCE')}
          checkItemValid={() => true}
          onChange={envFrom => update({ envFrom })}
        >
          <EnvironmentFromInput resourceOptions={resourceOptions} />
        </ArrayInput>
      </div>
      <div role="group" aria-label={t('WORKLOAD_HEALTH_CHECKS')}>
        <h4>{t('WORKLOAD_HEALTH_CHECKS')}</h4>
        <ProbeInput
          label={t('READINESS_PROBE')}
          value={value.readinessProbe}
          onChange={readinessProbe => update({ readinessProbe })}
        />
        <ProbeInput
          label={t('LIVENESS_PROBE')}
          value={value.livenessProbe}
          onChange={livenessProbe => update({ livenessProbe })}
        />
        <ProbeInput
          label={t('STARTUP_PROBE')}
          value={value.startupProbe}
          onChange={startupProbe => update({ startupProbe })}
        />
      </div>
      {(kind === 'CONTAINER' || value.restartPolicy === 'Always') && (
        <div role="group" aria-label={t('LIFECYCLE_MANAGEMENT')}>
          <h4>{t('LIFECYCLE_MANAGEMENT')}</h4>
          {(['postStart', 'preStop'] as const).map(stage => (
            <ProbeInput
              key={stage}
              label={t(stage === 'postStart' ? 'POSTSTART_ACTION' : 'PRESTOP_ACTION')}
              handlerOnly
              value={value.lifecycle?.[stage]}
              onChange={action => {
                const lifecycle = { ...value.lifecycle, [stage]: action };
                update({ lifecycle });
              }}
            />
          ))}
        </div>
      )}
      <SecurityContextInput
        kind="container"
        value={value.securityContext}
        onChange={securityContext => update({ securityContext })}
      />
      <div role="group" aria-label={t('SYNC_HOST_TIMEZONE')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch
            aria-label={t('SYNC_HOST_TIMEZONE')}
            checked={(value.volumeMounts || []).some(mount => mount.mountPath === '/etc/localtime')}
            onChange={checked => {
              const volumeMounts = (value.volumeMounts || []).filter(
                mount => mount.mountPath !== '/etc/localtime',
              );
              update({
                volumeMounts: checked
                  ? [
                      ...volumeMounts,
                      { name: 'host-time', mountPath: '/etc/localtime', readOnly: true },
                    ]
                  : volumeMounts,
              });
            }}
          />
          <strong>{t('SYNC_HOST_TIMEZONE')}</strong>
        </div>
        <div>{t('SYNC_HOST_TIMEZONE_DESC')}</div>
      </div>
      <div role="group" aria-label={t('RESOURCE_LIMITS')}>
        <h4>{t('RESOURCE_LIMITS')}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {(
            [
              ['requests', 'cpu', 'WORKLOAD_CPU_REQUEST'],
              ['requests', 'memory', 'WORKLOAD_MEMORY_REQUEST'],
              ['limits', 'cpu', 'WORKLOAD_CPU_LIMIT'],
              ['limits', 'memory', 'WORKLOAD_MEMORY_LIMIT'],
            ] as const
          ).map(([group, field, label]) => (
            <ContainerField key={`${group}.${field}`}>
              <span>{t(label)}</span>
              <Input
                value={value.resources?.[group]?.[field] || ''}
                placeholder={field === 'cpu' ? '100m' : '128Mi'}
                onChange={event =>
                  update({
                    resources: {
                      ...value.resources,
                      [group]: { ...value.resources?.[group], [field]: event.target.value },
                    },
                  })
                }
              />
            </ContainerField>
          ))}
        </div>
        {gpuTypes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ContainerField>
              <span>{t('GPU_TYPE')}</span>
              <Select
                aria-label={t('GPU_TYPE')}
                value={value.resources?.gpu?.type || gpuTypes[0] || ''}
                options={gpuTypes.map((type: string) => ({
                  label: type,
                  value: type,
                }))}
                onChange={type =>
                  update({
                    resources: {
                      ...value.resources,
                      gpu: { ...value.resources?.gpu, type: String(type) },
                    },
                  })
                }
              />
            </ContainerField>
            <ContainerField>
              <span>{t('GPU_LIMIT')}</span>
              <InputNumber
                aria-label={t('GPU_LIMIT')}
                min={0}
                precision={0}
                value={value.resources?.gpu?.value ? Number(value.resources.gpu.value) : undefined}
                onChange={gpuLimit =>
                  update({
                    resources: {
                      ...value.resources,
                      gpu: {
                        type: value.resources?.gpu?.type || gpuTypes[0] || '',
                        value: gpuLimit == null || gpuLimit === '' ? '' : String(gpuLimit),
                      },
                    },
                  })
                }
              />
            </ContainerField>
          </div>
        )}
      </div>
      <div role="group" aria-label={t('VOLUME_MOUNT_PL')}>
        <h4>{t('VOLUME_MOUNT_PL')}</h4>
        <ArrayInput
          itemType="object"
          value={value.volumeMounts || []}
          addText={t('WORKLOAD_ADD_VOLUME_MOUNT')}
          checkItemValid={() => true}
          onChange={volumeMounts => update({ volumeMounts })}
        >
          <VolumeMountInput volumeNames={volumeNames} />
        </ArrayInput>
      </div>
    </div>
  );
}
