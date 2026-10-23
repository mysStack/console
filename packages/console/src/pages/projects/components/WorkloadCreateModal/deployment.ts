import { cloneDeep, isEqual, omit } from 'lodash';

export interface ContainerPortValues {
  name?: string;
  containerPort?: number;
  protocol?: 'TCP' | 'UDP' | 'SCTP';
}

export interface EnvironmentValues {
  name: string;
  value?: string;
}

export interface EnvironmentFromValues {
  kind: 'configMap' | 'secret';
  name: string;
  prefix?: string;
}

export interface ProbeValues {
  type: 'http' | 'tcp' | 'command';
  path?: string;
  port?: number | string;
  scheme?: 'HTTP' | 'HTTPS';
  command?: string[];
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

export type LifecycleActionValues = Pick<
  ProbeValues,
  'type' | 'path' | 'port' | 'scheme' | 'command'
>;

export interface LifecycleValues {
  postStart?: LifecycleActionValues;
  preStop?: LifecycleActionValues;
}

export interface ResourceValues {
  requests?: { cpu?: string; memory?: string };
  limits?: { cpu?: string; memory?: string };
}

export interface VolumeMountValues {
  name: string;
  mountPath: string;
  subPath?: string;
  readOnly?: boolean;
}

export interface VolumeValues {
  name: string;
  type: 'persistentVolumeClaim' | 'emptyDir' | 'hostPath' | 'configMap' | 'secret' | 'preserved';
  source?: Record<string, any>;
  sourceName?: string;
  medium?: '' | 'Memory';
  sizeLimit?: string;
  hostPath?: string;
  hostPathType?: string;
}

export interface ContainerCreateValues {
  name: string;
  originalName?: string;
  image: string;
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  restartPolicy?: 'Always';
  command?: string[];
  args?: string[];
  ports?: ContainerPortValues[];
  env?: EnvironmentValues[];
  envFrom?: EnvironmentFromValues[];
  readinessProbe?: ProbeValues;
  livenessProbe?: ProbeValues;
  startupProbe?: ProbeValues;
  lifecycle?: LifecycleValues;
  resources?: ResourceValues;
  volumeMounts?: VolumeMountValues[];
}

export interface DeploymentCreateValues {
  name: string;
  namespace: string;
  aliasName?: string;
  description?: string;
  replicas: number;
  containers: ContainerCreateValues[];
  initContainers?: ContainerCreateValues[];
  volumes?: VolumeValues[];
}

export type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet';

export interface WorkloadSettingsValues extends DeploymentCreateValues {
  updateStrategy: {
    type: 'RollingUpdate' | 'Recreate' | 'OnDelete';
    maxUnavailable?: number | string;
    maxSurge?: number | string;
    partition?: number;
  };
  minReadySeconds: number;
  terminationGracePeriodSeconds: number;
}

const trim = (value = '') => value.trim();
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const QUANTITY = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:m|[EPTGMK]i?|[eE][+-]?[0-9]+)?$/;

function isDnsLabel(value: string): boolean {
  return value.length <= 63 && DNS_LABEL.test(value);
}

function isValidPort(port?: number | string): boolean {
  return typeof port === 'string'
    ? port.length <= 15 && /^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(port)
    : Number.isInteger(port) && port! >= 1 && port! <= 65535;
}

function validateProbe(probe?: ProbeValues): boolean {
  if (!probe) return true;
  if (probe.type === 'http') {
    if (!trim(probe.path).startsWith('/') || !isValidPort(probe.port)) return false;
  } else if (probe.type === 'tcp') {
    if (!isValidPort(probe.port)) return false;
  } else if (probe.type === 'command') {
    if (!probe.command?.map(trim).filter(Boolean).length) return false;
  } else {
    return false;
  }
  return [
    probe.initialDelaySeconds ?? 0,
    probe.timeoutSeconds ?? 1,
    probe.periodSeconds ?? 10,
    probe.successThreshold ?? 1,
    probe.failureThreshold ?? 3,
  ].every(value => Number.isInteger(value) && value >= 0);
}

function isValidQuantity(value?: string): boolean {
  return value == null || value === '' || QUANTITY.test(trim(value));
}

function validateLifecycleAction(action?: LifecycleActionValues): boolean {
  if (!action) return true;
  if (action.type === 'command') {
    return (
      Array.isArray(action.command) &&
      action.command.every(arg => typeof arg === 'string') &&
      Boolean(action.command[0]?.trim())
    );
  }
  return (
    validateProbe(action) &&
    (action.type !== 'http' ||
      action.scheme === undefined ||
      ['HTTP', 'HTTPS'].includes(action.scheme))
  );
}

export function validateVolumes(volumes: VolumeValues[] = []): string | undefined {
  const names = new Set<string>();
  for (const volume of volumes) {
    const name = trim(volume.name);
    if (!isDnsLabel(name)) return 'WORKLOAD_VOLUME_INVALID';
    if (names.has(name)) return 'WORKLOAD_VOLUME_DUPLICATE';
    names.add(name);
    if (
      ['persistentVolumeClaim', 'configMap', 'secret'].includes(volume.type) &&
      !isDnsLabel(trim(volume.sourceName))
    ) {
      return 'WORKLOAD_VOLUME_INVALID';
    }
    if (volume.type === 'hostPath' && !trim(volume.hostPath).startsWith('/')) {
      return 'WORKLOAD_VOLUME_INVALID';
    }
    if (volume.type === 'emptyDir' && !isValidQuantity(volume.sizeLimit)) {
      return 'WORKLOAD_VOLUME_INVALID';
    }
  }
}

export function validateContainers(
  containers: ContainerCreateValues[] = [],
  initContainers: ContainerCreateValues[] = [],
  volumes: VolumeValues[] = [],
  claimTemplateNames: string[] = [],
): string | undefined {
  if (!containers.length) return 'CONTAINER_EMPTY_DESC';
  const names = new Set<string>();
  const portNames = new Set<string>();
  for (const container of [...containers, ...initContainers]) {
    const name = trim(container.name);
    if (
      !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name) ||
      name.length > 63 ||
      !/^\S+$/.test(trim(container.image))
    ) {
      return 'WORKLOAD_CONTAINER_INVALID';
    }
    if (names.has(name)) return 'WORKLOAD_CONTAINER_DUPLICATE';
    names.add(name);
    const envNames = new Set<string>();
    for (const env of container.env || []) {
      const envName = trim(env.name);
      if (!/^[-._a-zA-Z][-._a-zA-Z0-9]*$/.test(envName)) return 'ENVIRONMENT_INVALID_TIP';
      if (envNames.has(envName)) return 'WORKLOAD_ENV_DUPLICATE';
      envNames.add(envName);
    }
    for (const port of container.ports || []) {
      const portName = trim(port.name);
      if (
        !Number.isInteger(port.containerPort) ||
        port.containerPort! < 1 ||
        port.containerPort! > 65535 ||
        !['TCP', 'UDP', 'SCTP'].includes(port.protocol || 'TCP') ||
        (portName && (portName.length > 15 || !/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(portName)))
      ) {
        return 'WORKLOAD_PORT_INVALID';
      }
      if (portName && portNames.has(portName)) return 'WORKLOAD_PORT_DUPLICATE';
      if (portName) portNames.add(portName);
    }
    if (
      !validateProbe(container.readinessProbe) ||
      !validateProbe(container.livenessProbe) ||
      !validateProbe(container.startupProbe)
    ) {
      return 'WORKLOAD_PROBE_INVALID';
    }
    if (
      (initContainers.includes(container) &&
        container.restartPolicy !== 'Always' &&
        Boolean(container.lifecycle)) ||
      !validateLifecycleAction(container.lifecycle?.postStart) ||
      !validateLifecycleAction(container.lifecycle?.preStop)
    ) {
      return 'WORKLOAD_LIFECYCLE_INVALID';
    }
    const quantities = [
      container.resources?.requests?.cpu,
      container.resources?.requests?.memory,
      container.resources?.limits?.cpu,
      container.resources?.limits?.memory,
    ];
    if (!quantities.every(isValidQuantity)) return 'WORKLOAD_RESOURCE_INVALID';
    for (const reference of container.envFrom || []) {
      if (!['configMap', 'secret'].includes(reference.kind) || !isDnsLabel(trim(reference.name))) {
        return 'WORKLOAD_CONFIG_REFERENCE_INVALID';
      }
    }
    const mountPaths = new Set<string>();
    const volumeNames = new Set([
      ...volumes.map(volume => trim(volume.name)),
      ...claimTemplateNames,
    ]);
    for (const mount of container.volumeMounts || []) {
      const mountPath = trim(mount.mountPath);
      if (
        !volumeNames.has(trim(mount.name)) ||
        !mountPath.startsWith('/') ||
        mountPaths.has(mountPath)
      ) {
        return 'WORKLOAD_VOLUME_MOUNT_INVALID';
      }
      mountPaths.add(mountPath);
    }
  }
}

function buildProbe(probe?: ProbeValues) {
  if (!probe) return undefined;
  const handler =
    probe.type === 'http'
      ? {
          httpGet: {
            path: trim(probe.path),
            port: probe.port!,
            scheme: probe.scheme || 'HTTP',
          },
        }
      : probe.type === 'tcp'
        ? { tcpSocket: { port: probe.port! } }
        : { exec: { command: probe.command!.map(trim).filter(Boolean) } };
  return {
    ...handler,
    initialDelaySeconds: probe.initialDelaySeconds ?? 0,
    timeoutSeconds: probe.timeoutSeconds ?? 1,
    periodSeconds: probe.periodSeconds ?? 10,
    successThreshold: probe.successThreshold ?? 1,
    failureThreshold: probe.failureThreshold ?? 3,
  };
}

function compactResources(resources?: ResourceValues) {
  if (!resources) return undefined;
  const compact = (values?: { cpu?: string; memory?: string }) => {
    const result = {
      ...(trim(values?.cpu) ? { cpu: trim(values?.cpu) } : {}),
      ...(trim(values?.memory) ? { memory: trim(values?.memory) } : {}),
    };
    return Object.keys(result).length ? result : undefined;
  };
  const requests = compact(resources.requests);
  const limits = compact(resources.limits);
  return requests || limits
    ? { ...(requests ? { requests } : {}), ...(limits ? { limits } : {}) }
    : undefined;
}

function buildLifecycleAction(action: LifecycleActionValues): Record<string, any> {
  if (action.type === 'command') return { exec: { command: [...action.command!] } };
  return omit(buildProbe(action), [
    'initialDelaySeconds',
    'timeoutSeconds',
    'periodSeconds',
    'successThreshold',
    'failureThreshold',
  ]);
}

function buildContainer(container: ContainerCreateValues) {
  const command = container.command?.map(trim).filter(Boolean);
  const args = container.args?.map(trim).filter(Boolean);
  const resources = compactResources(container.resources);
  const lifecycle = Object.fromEntries(
    Object.entries(container.lifecycle || {}).flatMap(([stage, action]) =>
      action ? [[stage, buildLifecycleAction(action)]] : [],
    ),
  );
  return {
    name: trim(container.name),
    image: trim(container.image),
    imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
    ...(container.restartPolicy ? { restartPolicy: container.restartPolicy } : {}),
    ...(command?.length ? { command } : {}),
    ...(args?.length ? { args } : {}),
    ...(container.ports?.length
      ? {
          ports: container.ports.map(port => ({
            ...(trim(port.name) ? { name: trim(port.name) } : {}),
            containerPort: port.containerPort!,
            protocol: port.protocol || 'TCP',
          })),
        }
      : {}),
    ...(container.env?.length
      ? { env: container.env.map(env => ({ name: trim(env.name), value: env.value ?? '' })) }
      : {}),
    ...(container.envFrom?.length
      ? {
          envFrom: container.envFrom.map(reference => ({
            ...(trim(reference.prefix) ? { prefix: trim(reference.prefix) } : {}),
            ...(reference.kind === 'configMap'
              ? { configMapRef: { name: trim(reference.name) } }
              : { secretRef: { name: trim(reference.name) } }),
          })),
        }
      : {}),
    ...(container.readinessProbe ? { readinessProbe: buildProbe(container.readinessProbe) } : {}),
    ...(container.livenessProbe ? { livenessProbe: buildProbe(container.livenessProbe) } : {}),
    ...(container.startupProbe ? { startupProbe: buildProbe(container.startupProbe) } : {}),
    ...(Object.keys(lifecycle).length ? { lifecycle } : {}),
    ...(resources ? { resources } : {}),
    ...(container.volumeMounts?.length
      ? {
          volumeMounts: container.volumeMounts.map(mount => ({
            name: trim(mount.name),
            mountPath: trim(mount.mountPath),
            ...(trim(mount.subPath) ? { subPath: trim(mount.subPath) } : {}),
            ...(mount.readOnly ? { readOnly: true } : {}),
          })),
        }
      : {}),
  };
}

function buildVolume(volume: VolumeValues) {
  if (volume.type === 'preserved') return cloneDeep(volume.source || {});
  const name = trim(volume.name);
  if (volume.type === 'persistentVolumeClaim') {
    return { name, persistentVolumeClaim: { claimName: trim(volume.sourceName) } };
  }
  if (volume.type === 'configMap') return { name, configMap: { name: trim(volume.sourceName) } };
  if (volume.type === 'secret') return { name, secret: { secretName: trim(volume.sourceName) } };
  if (volume.type === 'hostPath') {
    return {
      name,
      hostPath: {
        path: trim(volume.hostPath),
        ...(trim(volume.hostPathType) ? { type: trim(volume.hostPathType) } : {}),
      },
    };
  }
  return {
    name,
    emptyDir: {
      ...(volume.medium === 'Memory' ? { medium: 'Memory' } : {}),
      ...(trim(volume.sizeLimit) ? { sizeLimit: trim(volume.sizeLimit) } : {}),
    },
  };
}

function parseProbe(probe: Record<string, any> | undefined): ProbeValues | undefined {
  if (!probe) return undefined;
  const timing = {
    initialDelaySeconds: probe.initialDelaySeconds ?? 0,
    timeoutSeconds: probe.timeoutSeconds ?? 1,
    periodSeconds: probe.periodSeconds ?? 10,
    successThreshold: probe.successThreshold ?? 1,
    failureThreshold: probe.failureThreshold ?? 3,
  };
  if (probe.httpGet) {
    return {
      type: 'http',
      path: probe.httpGet.path || '/',
      port: probe.httpGet.port,
      scheme: probe.httpGet.scheme || 'HTTP',
      ...timing,
    };
  }
  if (probe.tcpSocket) {
    return { type: 'tcp', port: probe.tcpSocket.port, ...timing };
  }
  if (probe.exec) {
    return { type: 'command', command: probe.exec.command || [], ...timing };
  }
  return undefined;
}

function parseLifecycle(lifecycle?: Record<string, any>): LifecycleValues | undefined {
  if (!lifecycle) return undefined;
  return Object.fromEntries(
    ['postStart', 'preStop'].flatMap(stage => {
      const action = parseProbe(lifecycle[stage]);
      return action
        ? [
            [
              stage,
              omit(action, [
                'initialDelaySeconds',
                'timeoutSeconds',
                'periodSeconds',
                'successThreshold',
                'failureThreshold',
              ]),
            ],
          ]
        : [];
    }),
  );
}

function parseContainer(container: Record<string, any>): ContainerCreateValues {
  return {
    name: container.name || '',
    originalName: container.name,
    image: container.image || '',
    imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
    ...(container.restartPolicy ? { restartPolicy: container.restartPolicy } : {}),
    command: container.command,
    args: container.args,
    ports: container.ports,
    env: container.env
      ?.filter((item: Record<string, any>) => Object.prototype.hasOwnProperty.call(item, 'value'))
      .map((item: Record<string, any>) => ({ name: item.name, value: item.value })),
    envFrom: container.envFrom?.flatMap((item: Record<string, any>) => {
      if (item.configMapRef?.name) {
        return [{ kind: 'configMap' as const, name: item.configMapRef.name, prefix: item.prefix }];
      }
      if (item.secretRef?.name) {
        return [{ kind: 'secret' as const, name: item.secretRef.name, prefix: item.prefix }];
      }
      return [];
    }),
    readinessProbe: parseProbe(container.readinessProbe),
    livenessProbe: parseProbe(container.livenessProbe),
    startupProbe: parseProbe(container.startupProbe),
    lifecycle: parseLifecycle(container.lifecycle),
    resources: container.resources,
    volumeMounts: container.volumeMounts,
  };
}

function parseVolume(volume: Record<string, any>): VolumeValues | undefined {
  if (volume.persistentVolumeClaim) {
    return {
      name: volume.name,
      type: 'persistentVolumeClaim',
      sourceName: volume.persistentVolumeClaim.claimName,
    };
  }
  if (volume.configMap) {
    return { name: volume.name, type: 'configMap', sourceName: volume.configMap.name };
  }
  if (volume.secret) {
    return { name: volume.name, type: 'secret', sourceName: volume.secret.secretName };
  }
  if (volume.hostPath) {
    return {
      name: volume.name,
      type: 'hostPath',
      hostPath: volume.hostPath.path,
      hostPathType: volume.hostPath.type,
    };
  }
  if (volume.emptyDir) {
    return {
      name: volume.name,
      type: 'emptyDir',
      medium: volume.emptyDir.medium || '',
      sizeLimit: volume.emptyDir.sizeLimit,
    };
  }
  return { name: volume.name, type: 'preserved', source: cloneDeep(volume) };
}

export function parseDeploymentSettings(resource: Record<string, any>): WorkloadSettingsValues {
  const podSpec = cloneDeep(resource.spec?.template?.spec || {});
  const kind: WorkloadKind = resource.kind || 'Deployment';
  const strategy = resource.spec?.[kind === 'Deployment' ? 'strategy' : 'updateStrategy'];
  return {
    name: resource.metadata?.name || '',
    namespace: resource.metadata?.namespace || '',
    aliasName: resource.metadata?.annotations?.['kubesphere.io/alias-name'] || '',
    description: resource.metadata?.annotations?.['kubesphere.io/description'] || '',
    replicas: resource.spec?.replicas ?? 1,
    containers: (podSpec.containers || []).map(parseContainer),
    initContainers: (podSpec.initContainers || []).map(parseContainer),
    volumes: (podSpec.volumes || []).map(parseVolume).filter(Boolean) as VolumeValues[],
    updateStrategy: {
      type: strategy?.type || 'RollingUpdate',
      ...(kind === 'StatefulSet'
        ? { partition: strategy?.rollingUpdate?.partition ?? 0 }
        : {
            maxUnavailable:
              strategy?.rollingUpdate?.maxUnavailable ?? (kind === 'DaemonSet' ? 1 : '25%'),
            ...(kind === 'Deployment'
              ? { maxSurge: strategy?.rollingUpdate?.maxSurge ?? '25%' }
              : {}),
          }),
    },
    minReadySeconds: resource.spec?.minReadySeconds ?? 0,
    terminationGracePeriodSeconds: podSpec.terminationGracePeriodSeconds ?? 30,
  };
}

const EDITABLE_CONTAINER_FIELDS = [
  'image',
  'imagePullPolicy',
  'command',
  'args',
  'ports',
  'env',
  'envFrom',
  'readinessProbe',
  'livenessProbe',
  'startupProbe',
  'lifecycle',
  'resources',
  'volumeMounts',
] as const;

function mergeContainerSettings(
  originalContainers: Record<string, any>[] = [],
  values: ContainerCreateValues[],
) {
  return values.map(value => {
    const original =
      originalContainers.find(
        container => container.name === (value.originalName || trim(value.name)),
      ) || {};
    const next = { ...original };
    for (const field of EDITABLE_CONTAINER_FIELDS) delete next[field];
    const built: Record<string, any> = buildContainer(value);

    if (built.env) {
      const literalNames = new Set(built.env.map((item: Record<string, any>) => item.name));
      built.env = [
        ...built.env,
        ...(original.env || []).filter(
          (item: Record<string, any>) => item.valueFrom && !literalNames.has(item.name),
        ),
      ];
    } else {
      const valueFrom = (original.env || []).filter((item: Record<string, any>) => item.valueFrom);
      if (valueFrom.length) built.env = valueFrom;
    }

    if (built.ports) {
      built.ports = built.ports.map((port: Record<string, any>) => ({
        ...(original.ports || []).find(
          (item: Record<string, any>) =>
            item.name === port.name && item.containerPort === port.containerPort,
        ),
        ...port,
      }));
    }

    if (built.envFrom) {
      built.envFrom = built.envFrom.map((reference: Record<string, any>) => {
        const originalReference = (original.envFrom || []).find((item: Record<string, any>) =>
          reference.configMapRef
            ? item.configMapRef?.name === reference.configMapRef.name
            : item.secretRef?.name === reference.secretRef?.name,
        );
        return {
          ...omit(originalReference, ['prefix']),
          ...reference,
          ...(reference.configMapRef
            ? {
                configMapRef: {
                  ...originalReference?.configMapRef,
                  ...reference.configMapRef,
                },
              }
            : { secretRef: { ...originalReference?.secretRef, ...reference.secretRef } }),
        };
      });
    }

    if (built.resources || original.resources) {
      const mergeResourceGroup = (group: 'requests' | 'limits') => {
        const preserved = Object.fromEntries(
          Object.entries(original.resources?.[group] || {}).filter(
            ([key]) => key !== 'cpu' && key !== 'memory',
          ),
        );
        const merged = { ...preserved, ...built.resources?.[group] };
        return Object.keys(merged).length ? merged : undefined;
      };
      const requests = mergeResourceGroup('requests');
      const limits = mergeResourceGroup('limits');
      built.resources = {
        ...(requests ? { requests } : {}),
        ...(limits ? { limits } : {}),
      };
      if (!Object.keys(built.resources).length) delete built.resources;
    }

    if (built.volumeMounts) {
      built.volumeMounts = built.volumeMounts.map((mount: Record<string, any>) => ({
        ...omit(
          (original.volumeMounts || []).find(
            (item: Record<string, any>) =>
              item.name === mount.name && item.mountPath === mount.mountPath,
          ),
          ['name', 'mountPath', 'subPath', 'readOnly'],
        ),
        ...mount,
      }));
    }

    const parsed = parseContainer(original);
    if (!isEqual(value.lifecycle, parsed.lifecycle) && value.lifecycle) {
      const lifecycle = cloneDeep(original.lifecycle || {});
      for (const stage of ['postStart', 'preStop'] as const) {
        const action = value.lifecycle[stage];
        if (isEqual(action, parsed.lifecycle?.[stage])) continue;
        if (!action) {
          delete lifecycle[stage];
          continue;
        }
        const handler = buildLifecycleAction(action);
        const key = Object.keys(handler)[0];
        lifecycle[stage] = {
          [key]: { ...original.lifecycle?.[stage]?.[key], ...handler[key] },
        };
      }
      if (Object.keys(lifecycle).length) built.lifecycle = lifecycle;
      else delete built.lifecycle;
    }
    for (const field of EDITABLE_CONTAINER_FIELDS) {
      if (isEqual(value[field], parsed[field])) {
        if (original[field] === undefined) delete built[field];
        else built[field] = cloneDeep(original[field]);
      }
    }
    for (const field of ['readinessProbe', 'livenessProbe', 'startupProbe'] as const) {
      if (!built[field] || isEqual(value[field], parsed[field])) continue;
      const handler = built[field].httpGet
        ? 'httpGet'
        : built[field].tcpSocket
          ? 'tcpSocket'
          : 'exec';
      const oldProbe = original[field] || {};
      built[field] = {
        ...omit(oldProbe, ['httpGet', 'tcpSocket', 'exec', 'grpc']),
        ...built[field],
        [handler]: { ...oldProbe[handler], ...built[field][handler] },
      };
    }
    return { ...next, ...built };
  });
}

function mergeVolumeSettings(originalVolumes: Record<string, any>[] = [], values: VolumeValues[]) {
  return values.map(value => {
    if (value.type === 'preserved') return cloneDeep(value.source);
    const built: Record<string, any> = buildVolume(value);
    const original = originalVolumes.find(volume => volume.name === built.name) || {};
    const sourceKey = ['persistentVolumeClaim', 'emptyDir', 'hostPath', 'configMap', 'secret'].find(
      key => built[key],
    );
    const fields =
      sourceKey === 'emptyDir'
        ? ['medium', 'sizeLimit']
        : sourceKey === 'hostPath'
          ? ['path', 'type']
          : sourceKey === 'secret'
            ? ['secretName']
            : sourceKey === 'configMap'
              ? ['name']
              : ['claimName'];
    return sourceKey && original[sourceKey]
      ? { ...built, [sourceKey]: { ...omit(original[sourceKey], fields), ...built[sourceKey] } }
      : built;
  });
}

export function validateWorkloadSettings(
  original: Record<string, any>,
  values: DeploymentCreateValues & Partial<WorkloadSettingsValues>,
): string | undefined {
  const kind: WorkloadKind = original.kind || 'Deployment';
  const isCount = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  const isIntOrPercent = (value: unknown, maxPercent?: number) => {
    if (typeof value === 'number') return isCount(value);
    if (typeof value !== 'string' || !/^\d+%?$/.test(value)) return false;
    const count = Number(value.replace('%', ''));
    return (
      isCount(count) && (!value.endsWith('%') || maxPercent === undefined || count <= maxPercent)
    );
  };
  const isZero = (value: unknown) =>
    value !== undefined && Number(String(value).replace('%', '')) === 0;
  if (
    !['Deployment', 'StatefulSet', 'DaemonSet'].includes(kind) ||
    (kind !== 'DaemonSet' && !isCount(values.replicas)) ||
    (values.terminationGracePeriodSeconds !== undefined &&
      !isCount(values.terminationGracePeriodSeconds)) ||
    (kind === 'DaemonSet' &&
      values.minReadySeconds !== undefined &&
      !isCount(values.minReadySeconds))
  )
    return 'WORKLOAD_SETTINGS_INVALID';
  const strategy = values.updateStrategy;
  if (!strategy) return undefined;
  if (!['RollingUpdate', kind === 'Deployment' ? 'Recreate' : 'OnDelete'].includes(strategy.type)) {
    return 'WORKLOAD_SETTINGS_INVALID';
  }
  if (strategy.type !== 'RollingUpdate') return undefined;
  if (kind === 'StatefulSet')
    return isCount(strategy.partition) ? undefined : 'WORKLOAD_SETTINGS_INVALID';
  if (!isIntOrPercent(strategy.maxUnavailable, 100)) return 'WORKLOAD_SETTINGS_INVALID';
  const maxSurge =
    kind === 'Deployment'
      ? strategy.maxSurge
      : (original.spec?.updateStrategy?.rollingUpdate?.maxSurge ?? 0);
  if (!isIntOrPercent(maxSurge) || (isZero(strategy.maxUnavailable) && isZero(maxSurge))) {
    return 'WORKLOAD_SETTINGS_INVALID';
  }
  return undefined;
}

export function buildDeploymentSettingsResource(
  original: Record<string, any>,
  values: DeploymentCreateValues & Partial<WorkloadSettingsValues>,
) {
  const validationError = validateWorkloadSettings(original, values);
  if (validationError) throw new Error(validationError);
  const result = cloneDeep(original);
  delete result.status;
  const originalPodSpec = original.spec?.template?.spec || {};
  const nextPodSpec = result.spec.template.spec;
  nextPodSpec.containers = mergeContainerSettings(originalPodSpec.containers, values.containers);
  if (values.initContainers?.length) {
    nextPodSpec.initContainers = mergeContainerSettings(
      originalPodSpec.initContainers,
      values.initContainers,
    );
  } else {
    delete nextPodSpec.initContainers;
  }
  if (values.volumes?.length) {
    nextPodSpec.volumes = mergeVolumeSettings(originalPodSpec.volumes, values.volumes);
  } else delete nextPodSpec.volumes;
  const kind: WorkloadKind = original.kind || 'Deployment';
  const initial = parseDeploymentSettings(original);
  if (kind !== 'DaemonSet') result.spec.replicas = values.replicas;
  if (
    values.terminationGracePeriodSeconds !== undefined &&
    values.terminationGracePeriodSeconds !== initial.terminationGracePeriodSeconds
  ) {
    nextPodSpec.terminationGracePeriodSeconds = values.terminationGracePeriodSeconds;
  }
  if (
    kind === 'DaemonSet' &&
    values.minReadySeconds !== undefined &&
    values.minReadySeconds !== initial.minReadySeconds
  ) {
    result.spec.minReadySeconds = values.minReadySeconds;
  }
  if (values.updateStrategy && !isEqual(values.updateStrategy, initial.updateStrategy)) {
    const key = kind === 'Deployment' ? 'strategy' : 'updateStrategy';
    const { type, maxUnavailable, maxSurge, partition } = values.updateStrategy;
    const next = { ...result.spec[key], type };
    if (type === 'RollingUpdate') {
      next.rollingUpdate = { ...next.rollingUpdate };
      const asIntOrPercent = (value: number | string | undefined) =>
        typeof value === 'string' && !value.endsWith('%') ? Number(value) : value;
      if (kind === 'StatefulSet') next.rollingUpdate.partition = partition;
      else {
        next.rollingUpdate.maxUnavailable = asIntOrPercent(maxUnavailable);
        if (kind === 'Deployment') next.rollingUpdate.maxSurge = asIntOrPercent(maxSurge);
      }
    } else delete next.rollingUpdate;
    result.spec[key] = next;
  }
  return result;
}

export function buildDeployment(values: DeploymentCreateValues) {
  const name = trim(values.name);
  const aliasName = trim(values.aliasName);
  const description = trim(values.description);
  const annotations: Record<string, string> = {};
  // The current v3dist BaseInfo handler mirrors this label into the selector
  // and pod template. Keep that behavior until the application filter is
  // migrated separately.
  const labels = { app: name.slice(0, 63) };

  if (aliasName) annotations['kubesphere.io/alias-name'] = aliasName;
  if (description) annotations['kubesphere.io/description'] = description;

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace: trim(values.namespace),
      annotations,
      labels,
    },
    spec: {
      replicas: values.replicas,
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        spec: {
          serviceAccountName: 'default',
          containers: values.containers.map(buildContainer),
          ...(values.initContainers?.length
            ? { initContainers: values.initContainers.map(buildContainer) }
            : {}),
          ...(values.volumes?.length ? { volumes: values.volumes.map(buildVolume) } : {}),
        },
      },
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
          maxUnavailable: '25%',
          maxSurge: '25%',
        },
      },
    },
  };
}
