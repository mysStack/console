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
  port?: number;
  scheme?: 'HTTP' | 'HTTPS';
  command?: string[];
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
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
  type: 'persistentVolumeClaim' | 'emptyDir' | 'hostPath' | 'configMap' | 'secret';
  sourceName?: string;
  medium?: '' | 'Memory';
  sizeLimit?: string;
  hostPath?: string;
  hostPathType?: string;
}

export interface ContainerCreateValues {
  name: string;
  image: string;
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  command?: string[];
  args?: string[];
  ports?: ContainerPortValues[];
  env?: EnvironmentValues[];
  envFrom?: EnvironmentFromValues[];
  readinessProbe?: ProbeValues;
  livenessProbe?: ProbeValues;
  startupProbe?: ProbeValues;
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

const trim = (value = '') => value.trim();
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const QUANTITY = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:m|[EPTGMK]i?|[eE][+-]?[0-9]+)?$/;

function isDnsLabel(value: string): boolean {
  return value.length <= 63 && DNS_LABEL.test(value);
}

function isValidPort(port?: number): boolean {
  return Number.isInteger(port) && port! >= 1 && port! <= 65535;
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
    const volumeNames = new Set(volumes.map(volume => trim(volume.name)));
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

function buildContainer(container: ContainerCreateValues) {
  const command = container.command?.map(trim).filter(Boolean);
  const args = container.args?.map(trim).filter(Boolean);
  const resources = compactResources(container.resources);
  return {
    name: trim(container.name),
    image: trim(container.image),
    imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
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
      port: Number(probe.httpGet.port),
      scheme: probe.httpGet.scheme || 'HTTP',
      ...timing,
    };
  }
  if (probe.tcpSocket) {
    return { type: 'tcp', port: Number(probe.tcpSocket.port), ...timing };
  }
  if (probe.exec) {
    return { type: 'command', command: probe.exec.command || [], ...timing };
  }
  return undefined;
}

function parseContainer(container: Record<string, any>): ContainerCreateValues {
  return {
    name: container.name || '',
    image: container.image || '',
    imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
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
  return undefined;
}

export function parseDeploymentSettings(resource: Record<string, any>): DeploymentCreateValues {
  const podSpec = resource.spec?.template?.spec || {};
  return {
    name: resource.metadata?.name || '',
    namespace: resource.metadata?.namespace || '',
    aliasName: resource.metadata?.annotations?.['kubesphere.io/alias-name'] || '',
    description: resource.metadata?.annotations?.['kubesphere.io/description'] || '',
    replicas: resource.spec?.replicas ?? 1,
    containers: (podSpec.containers || []).map(parseContainer),
    initContainers: (podSpec.initContainers || []).map(parseContainer),
    volumes: (podSpec.volumes || []).map(parseVolume).filter(Boolean) as VolumeValues[],
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
  'resources',
  'volumeMounts',
] as const;

function mergeContainerSettings(
  originalContainers: Record<string, any>[] = [],
  values: ContainerCreateValues[],
) {
  return values.map(value => {
    const original =
      originalContainers.find(container => container.name === trim(value.name)) || {};
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
          ...originalReference,
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
        ...(original.volumeMounts || []).find(
          (item: Record<string, any>) =>
            item.name === mount.name && item.mountPath === mount.mountPath,
        ),
        ...mount,
      }));
    }

    for (const field of ['readinessProbe', 'livenessProbe', 'startupProbe'] as const) {
      if (!built[field] && original[field] && !parseProbe(original[field])) {
        built[field] = original[field];
      }
    }
    return { ...next, ...built };
  });
}

function mergeVolumeSettings(originalVolumes: Record<string, any>[] = [], values: VolumeValues[]) {
  return values.map(value => {
    const built: Record<string, any> = buildVolume(value);
    const original = originalVolumes.find(volume => volume.name === built.name) || {};
    const sourceKey = ['persistentVolumeClaim', 'emptyDir', 'hostPath', 'configMap', 'secret'].find(
      key => built[key],
    );
    return sourceKey && original[sourceKey]
      ? { ...built, [sourceKey]: { ...original[sourceKey], ...built[sourceKey] } }
      : built;
  });
}

export function buildDeploymentSettingsResource(
  original: Record<string, any>,
  values: DeploymentCreateValues,
) {
  const result = JSON.parse(JSON.stringify(original));
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
  result.spec.replicas = values.replicas;
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
