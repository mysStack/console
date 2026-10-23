import { cloneDeep, isEqual, omit } from 'lodash';

export interface ContainerPortValues {
  name?: string;
  containerPort?: number;
  servicePort?: number;
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

export interface SecurityContextValues {
  privileged?: boolean;
  allowPrivilegeEscalation?: boolean;
  readOnlyRootFilesystem?: boolean;
  runAsNonRoot?: boolean;
  runAsUser?: number;
  runAsGroup?: number;
  seLinuxOptions?: {
    level?: string;
    role?: string;
    type?: string;
    user?: string;
  };
  capabilities?: {
    add?: string[];
    drop?: string[];
  };
}

export type PodSchedulingMode =
  | 'default'
  | 'decentralized'
  | 'aggregation'
  | 'custom'
  | 'preserved';

export interface PodSchedulingRuleValues {
  policy?: 'podAffinity' | 'podAntiAffinity';
  type?:
    | 'preferredDuringSchedulingIgnoredDuringExecution'
    | 'requiredDuringSchedulingIgnoredDuringExecution';
  target?: string;
}

export interface PodSchedulingValues {
  mode: PodSchedulingMode;
  rules?: PodSchedulingRuleValues[];
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

export interface PersistentVolumeClaimTemplateValues {
  name: string;
  accessModes: string[];
  storage: string;
  storageClassName?: string;
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
  securityContext?: SecurityContextValues;
  resources?: ResourceValues;
  volumeMounts?: VolumeMountValues[];
}

const HOST_TIME_VOLUME_NAME = 'host-time';
const HOST_TIME_MOUNT_PATH = '/etc/localtime';

export interface DeploymentCreateValues {
  name: string;
  namespace: string;
  aliasName?: string;
  description?: string;
  replicas: number;
  containers: ContainerCreateValues[];
  initContainers?: ContainerCreateValues[];
  volumes?: VolumeValues[];
  podSecurityContext?: SecurityContextValues;
  workloadLabels?: Record<string, string>;
  workloadAnnotations?: Record<string, string>;
  podAnnotations?: Record<string, string>;
  podScheduling?: PodSchedulingValues;
  nodeSelector?: Record<string, string>;
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
  volumeClaimTemplates?: PersistentVolumeClaimTemplateValues[];
}

export type WorkloadCreateValues = DeploymentCreateValues &
  Partial<
    Pick<
      WorkloadSettingsValues,
      | 'updateStrategy'
      | 'minReadySeconds'
      | 'terminationGracePeriodSeconds'
      | 'volumeClaimTemplates'
    >
  >;

const trim = (value = '') => value.trim();
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const QUANTITY = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:m|[EPTGMK]i?|[eE][+-]?[0-9]+)?$/;

function isDnsLabel(value: string): boolean {
  return value.length <= 63 && DNS_LABEL.test(value);
}

function isDnsSubdomain(value: string): boolean {
  return value.length <= 253 && value.split('.').every(part => isDnsLabel(part));
}

const QUALIFIED_NAME = /^[A-Za-z0-9](?:[-_.A-Za-z0-9]*[A-Za-z0-9])?$/;

function isQualifiedName(value: string): boolean {
  const parts = value.split('/');
  if (parts.length > 2) return false;
  const name = parts.at(-1) || '';
  if (name.length > 63 || !QUALIFIED_NAME.test(name)) return false;
  if (parts.length === 1) return true;
  const prefix = parts[0];
  return (
    prefix.length > 0 && prefix.length <= 253 && prefix.split('.').every(part => isDnsLabel(part))
  );
}

function isLabelValue(value: string): boolean {
  return value === '' || (value.length <= 63 && QUALIFIED_NAME.test(value));
}

export function validatePodAnnotations(annotations?: Record<string, string>): boolean {
  if (annotations === undefined) return true;
  if (annotations === null || Array.isArray(annotations) || typeof annotations !== 'object') {
    return false;
  }
  return Object.entries(annotations).every(([key, value]) => {
    if (typeof value !== 'string') return false;
    return isQualifiedName(key);
  });
}

export function validateWorkloadLabels(labels?: Record<string, string>): boolean {
  if (labels === undefined) return true;
  if (labels === null || Array.isArray(labels) || typeof labels !== 'object') return false;
  return Object.entries(labels).every(
    ([key, value]) => typeof value === 'string' && isQualifiedName(key) && isLabelValue(value),
  );
}

export function buildWorkloadLabels(name: string, labels?: Record<string, string>) {
  return { ...cloneDeep(labels || {}), app: trim(name).slice(0, 63) };
}

export async function checkWorkloadLabelsAvailability(
  checkLabels: (params: Record<string, any>) => Promise<unknown>,
  params: { cluster: string; namespace: string; name: string; labels?: Record<string, string> },
): Promise<string | undefined> {
  try {
    const result = (await checkLabels({
      cluster: params.cluster,
      namespace: params.namespace,
      labels: buildWorkloadLabels(params.name, params.labels),
    })) as { exist?: boolean };
    return result.exist ? 'DUPLICATE_LABELS' : undefined;
  } catch {
    return 'WORKLOAD_LABEL_CHECK_FAILED';
  }
}

export function validateNodeSelector(nodeSelector?: Record<string, string>): boolean {
  if (nodeSelector === undefined) return true;
  if (nodeSelector === null || Array.isArray(nodeSelector) || typeof nodeSelector !== 'object') {
    return false;
  }
  return Object.entries(nodeSelector).every(
    ([key, value]) => typeof value === 'string' && isQualifiedName(key) && isLabelValue(value),
  );
}

export function validatePodScheduling(scheduling?: PodSchedulingValues): boolean {
  if (!scheduling) return true;
  if (
    !['default', 'decentralized', 'aggregation', 'custom', 'preserved'].includes(scheduling.mode)
  ) {
    return false;
  }
  if (scheduling.mode !== 'custom') return true;
  const rules = scheduling.rules || [];
  const policies = rules.map(rule => rule.policy);
  return Boolean(
    policies.length &&
      new Set(policies).size === policies.length &&
      rules.every(
        rule =>
          ['podAffinity', 'podAntiAffinity'].includes(rule.policy || '') &&
          [
            'preferredDuringSchedulingIgnoredDuringExecution',
            'requiredDuringSchedulingIgnoredDuringExecution',
          ].includes(rule.type || '') &&
          isLabelValue(rule.target || '') &&
          Boolean(rule.target),
      ),
  );
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

function isPositiveQuantity(value?: string): boolean {
  const normalized = trim(value);
  return (
    isValidQuantity(normalized) &&
    Boolean(normalized) &&
    !/^0+(?:\.0+)?(?:m|[EPTGMK]i?|[eE][+-]?[0-9]+)?$/.test(normalized)
  );
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

export function validateSecurityContext(
  securityContext?: SecurityContextValues,
  container = true,
): boolean {
  if (!securityContext) return true;
  const booleans = [
    securityContext.runAsNonRoot,
    ...(container
      ? [
          securityContext.privileged,
          securityContext.allowPrivilegeEscalation,
          securityContext.readOnlyRootFilesystem,
        ]
      : []),
  ];
  if (booleans.some(value => value !== undefined && typeof value !== 'boolean')) return false;
  if (
    [securityContext.runAsUser, securityContext.runAsGroup].some(
      value => value !== undefined && !Number.isInteger(value),
    )
  )
    return false;
  if (Object.values(securityContext.seLinuxOptions || {}).some(value => typeof value !== 'string'))
    return false;
  if (!container && securityContext.capabilities !== undefined) return false;
  return Object.values(securityContext.capabilities || {}).every(
    values =>
      Array.isArray(values) &&
      values.every(value => typeof value === 'string' && /^(?:[A-Z][A-Z0-9_]*|ALL)$/.test(value)),
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

export function validateVolumeClaimTemplates(
  templates: PersistentVolumeClaimTemplateValues[] = [],
): string | undefined {
  const names = new Set<string>();
  const accessModes = new Set([
    'ReadWriteOnce',
    'ReadOnlyMany',
    'ReadWriteMany',
    'ReadWriteOncePod',
  ]);
  for (const template of templates) {
    const name = trim(template.name);
    if (!isDnsLabel(name) || names.has(name)) {
      return names.has(name) ? 'WORKLOAD_VOLUME_CLAIM_DUPLICATE' : 'WORKLOAD_VOLUME_CLAIM_INVALID';
    }
    names.add(name);
    if (
      !Array.isArray(template.accessModes) ||
      !template.accessModes.length ||
      template.accessModes.some(mode => !accessModes.has(mode)) ||
      !isPositiveQuantity(template.storage) ||
      (template.storageClassName !== undefined &&
        template.storageClassName !== '' &&
        !isDnsSubdomain(trim(template.storageClassName)))
    ) {
      return 'WORKLOAD_VOLUME_CLAIM_INVALID';
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
        (port.servicePort !== undefined &&
          (!Number.isInteger(port.servicePort) ||
            port.servicePort < 1 ||
            port.servicePort > 65535)) ||
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
    if (!validateSecurityContext(container.securityContext)) {
      return 'WORKLOAD_SECURITY_CONTEXT_INVALID';
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
      const isManagedHostTimeMount =
        trim(mount.name) === HOST_TIME_VOLUME_NAME && mountPath === HOST_TIME_MOUNT_PATH;
      if (
        (!volumeNames.has(trim(mount.name)) && !isManagedHostTimeMount) ||
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

function compactSecurityContext(
  securityContext?: SecurityContextValues,
  container = true,
): SecurityContextValues | undefined {
  if (!securityContext) return undefined;
  const result: SecurityContextValues = {};
  const copy = (field: keyof SecurityContextValues) => {
    if (securityContext[field] !== undefined) (result as any)[field] = securityContext[field];
  };
  if (container) {
    copy('privileged');
    copy('allowPrivilegeEscalation');
    copy('readOnlyRootFilesystem');
  }
  copy('runAsNonRoot');
  copy('runAsUser');
  copy('runAsGroup');
  const seLinuxOptions = Object.fromEntries(
    Object.entries(securityContext.seLinuxOptions || {}).filter(([, value]) => value !== ''),
  );
  if (Object.keys(seLinuxOptions).length) result.seLinuxOptions = seLinuxOptions;
  if (container) {
    const capabilities = Object.fromEntries(
      Object.entries(securityContext.capabilities || {}).filter(([, values]) => values?.length),
    );
    if (Object.keys(capabilities).length) result.capabilities = capabilities;
  }
  return Object.keys(result).length ? result : undefined;
}

function buildContainer(container: ContainerCreateValues) {
  const command = container.command?.map(trim).filter(Boolean);
  const args = container.args?.map(trim).filter(Boolean);
  const resources = compactResources(container.resources);
  const securityContext = compactSecurityContext(container.securityContext);
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
    ...(securityContext ? { securityContext } : {}),
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

function reconcileHostTimeVolume(
  volumes: Record<string, any>[] = [],
  containers: Record<string, any>[] = [],
  initContainers: Record<string, any>[] = [],
  originalVolumes: Record<string, any>[] = [],
) {
  const next = cloneDeep(volumes);
  const enabled = [...containers, ...initContainers].some(container =>
    (container.volumeMounts || []).some(
      (mount: Record<string, any>) => mount.mountPath === HOST_TIME_MOUNT_PATH,
    ),
  );
  if (enabled) {
    if (!next.some(volume => volume.name === HOST_TIME_VOLUME_NAME)) {
      const originalIndex = originalVolumes.findIndex(
        volume =>
          volume.name === HOST_TIME_VOLUME_NAME && volume.hostPath?.path === HOST_TIME_MOUNT_PATH,
      );
      const volume =
        originalIndex >= 0
          ? cloneDeep(originalVolumes[originalIndex])
          : {
              name: HOST_TIME_VOLUME_NAME,
              hostPath: { path: HOST_TIME_MOUNT_PATH, type: '' },
            };
      next.splice(
        Math.min(originalIndex < 0 ? next.length : originalIndex, next.length),
        0,
        volume,
      );
    }
    return next;
  }
  return next.filter(
    volume =>
      !(volume.name === HOST_TIME_VOLUME_NAME && volume.hostPath?.path === HOST_TIME_MOUNT_PATH),
  );
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

function parseSecurityContext(
  securityContext?: Record<string, any>,
  container = true,
): SecurityContextValues | undefined {
  if (!securityContext) return undefined;
  const result: SecurityContextValues = {};
  const fields: (keyof SecurityContextValues)[] = [
    'runAsNonRoot',
    'runAsUser',
    'runAsGroup',
    ...(container
      ? (['privileged', 'allowPrivilegeEscalation', 'readOnlyRootFilesystem'] as const)
      : []),
  ];
  for (const field of fields) {
    if (securityContext[field] !== undefined) (result as any)[field] = securityContext[field];
  }
  if (securityContext.seLinuxOptions) {
    result.seLinuxOptions = cloneDeep(
      Object.fromEntries(
        ['level', 'role', 'type', 'user'].flatMap(field =>
          securityContext.seLinuxOptions[field] !== undefined
            ? [[field, securityContext.seLinuxOptions[field]]]
            : [],
        ),
      ),
    );
  }
  if (container && securityContext.capabilities) {
    result.capabilities = cloneDeep(
      Object.fromEntries(
        ['add', 'drop'].flatMap(field =>
          securityContext.capabilities[field] !== undefined
            ? [[field, securityContext.capabilities[field]]]
            : [],
        ),
      ),
    );
  }
  return Object.keys(result).length ? result : undefined;
}

function buildPreferredPodAffinity(labels: Record<string, string>) {
  return {
    preferredDuringSchedulingIgnoredDuringExecution: [
      {
        weight: 100,
        podAffinityTerm: {
          labelSelector: { matchLabels: cloneDeep(labels) },
          topologyKey: 'kubernetes.io/hostname',
        },
      },
    ],
  };
}

function buildPodSchedulingAffinity(
  scheduling: PodSchedulingValues | undefined,
  labels: Record<string, string>,
): Record<string, any> | undefined {
  if (!scheduling || ['default', 'preserved'].includes(scheduling.mode)) return undefined;
  if (scheduling.mode === 'decentralized') {
    return { podAntiAffinity: buildPreferredPodAffinity(labels) };
  }
  if (scheduling.mode === 'aggregation') {
    return { podAffinity: buildPreferredPodAffinity(labels) };
  }
  const affinity: Record<string, any> = {};
  for (const rule of scheduling.rules || []) {
    const expression = {
      labelSelector: {
        matchExpressions: [{ key: 'app', operator: 'In', values: [rule.target] }],
      },
      topologyKey: 'kubernetes.io/hostname',
    };
    affinity[rule.policy!] =
      rule.type === 'preferredDuringSchedulingIgnoredDuringExecution'
        ? {
            preferredDuringSchedulingIgnoredDuringExecution: [
              { weight: 100, podAffinityTerm: expression },
            ],
          }
        : { requiredDuringSchedulingIgnoredDuringExecution: [expression] };
  }
  return affinity;
}

function parsePodScheduling(
  affinity: Record<string, any> | undefined,
  labels: Record<string, string>,
): PodSchedulingValues {
  if (!affinity || !Object.keys(affinity).length) return { mode: 'default' };
  if (isEqual(affinity, { podAntiAffinity: buildPreferredPodAffinity(labels) })) {
    return { mode: 'decentralized' };
  }
  if (isEqual(affinity, { podAffinity: buildPreferredPodAffinity(labels) })) {
    return { mode: 'aggregation' };
  }
  const rules: PodSchedulingRuleValues[] = [];
  for (const [policy, config] of Object.entries(affinity)) {
    if (!['podAffinity', 'podAntiAffinity'].includes(policy)) return { mode: 'preserved' };
    const types = Object.keys(config || {});
    if (
      types.length !== 1 ||
      ![
        'preferredDuringSchedulingIgnoredDuringExecution',
        'requiredDuringSchedulingIgnoredDuringExecution',
      ].includes(types[0])
    ) {
      return { mode: 'preserved' };
    }
    const type = types[0] as PodSchedulingRuleValues['type'];
    const entries = config[type!] || [];
    if (!Array.isArray(entries) || entries.length !== 1) return { mode: 'preserved' };
    const target =
      type === 'preferredDuringSchedulingIgnoredDuringExecution'
        ? entries[0]?.podAffinityTerm?.labelSelector?.matchExpressions?.[0]?.values?.[0]
        : entries[0]?.labelSelector?.matchExpressions?.[0]?.values?.[0];
    if (!target || !isLabelValue(target)) return { mode: 'preserved' };
    const expectedTerm = {
      labelSelector: {
        matchExpressions: [{ key: 'app', operator: 'In', values: [target] }],
      },
      topologyKey: 'kubernetes.io/hostname',
    };
    const expectedConfig =
      type === 'preferredDuringSchedulingIgnoredDuringExecution'
        ? {
            preferredDuringSchedulingIgnoredDuringExecution: [
              { weight: 100, podAffinityTerm: expectedTerm },
            ],
          }
        : { requiredDuringSchedulingIgnoredDuringExecution: [expectedTerm] };
    if (!isEqual(config, expectedConfig)) return { mode: 'preserved' };
    rules.push({ policy: policy as PodSchedulingRuleValues['policy'], type, target });
  }
  return rules.length ? { mode: 'custom', rules } : { mode: 'preserved' };
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
    securityContext: parseSecurityContext(container.securityContext),
    resources: container.resources,
    volumeMounts: container.volumeMounts,
  };
}

function parseVolume(volume: Record<string, any>): VolumeValues | undefined {
  if (volume.name === HOST_TIME_VOLUME_NAME && volume.hostPath?.path === HOST_TIME_MOUNT_PATH) {
    return undefined;
  }
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

function parseVolumeClaimTemplate(
  template: Record<string, any>,
): PersistentVolumeClaimTemplateValues {
  return {
    name: template.metadata?.name || '',
    accessModes: cloneDeep(template.spec?.accessModes || []),
    storage: template.spec?.resources?.requests?.storage || '',
    ...(template.spec?.storageClassName
      ? { storageClassName: template.spec.storageClassName }
      : {}),
  };
}

export function parseDeploymentSettings(resource: Record<string, any>): WorkloadSettingsValues {
  const podSpec = cloneDeep(resource.spec?.template?.spec || {});
  const kind: WorkloadKind = resource.kind || 'Deployment';
  const podLabels = resource.spec?.template?.metadata?.labels || {};
  const strategy = resource.spec?.[kind === 'Deployment' ? 'strategy' : 'updateStrategy'];
  return {
    name: resource.metadata?.name || '',
    namespace: resource.metadata?.namespace || '',
    aliasName: resource.metadata?.annotations?.['kubesphere.io/alias-name'] || '',
    description: resource.metadata?.annotations?.['kubesphere.io/description'] || '',
    workloadLabels: cloneDeep(resource.metadata?.labels),
    workloadAnnotations: cloneDeep(resource.metadata?.annotations),
    replicas: resource.spec?.replicas ?? 1,
    containers: (podSpec.containers || []).map(parseContainer),
    initContainers: (podSpec.initContainers || []).map(parseContainer),
    volumes: (podSpec.volumes || []).map(parseVolume).filter(Boolean) as VolumeValues[],
    ...(kind === 'StatefulSet'
      ? {
          volumeClaimTemplates: (resource.spec?.volumeClaimTemplates || []).map(
            parseVolumeClaimTemplate,
          ),
        }
      : {}),
    podAnnotations: cloneDeep(resource.spec?.template?.metadata?.annotations),
    ...(kind !== 'DaemonSet'
      ? { podScheduling: parsePodScheduling(podSpec.affinity, podLabels) }
      : {}),
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
    podSecurityContext: parseSecurityContext(podSpec.securityContext, false),
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
  'securityContext',
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
    if (!isEqual(value.securityContext, parsed.securityContext) && value.securityContext) {
      const modeled = compactSecurityContext(value.securityContext) || {};
      built.securityContext = {
        ...omit(original.securityContext, [
          'privileged',
          'allowPrivilegeEscalation',
          'readOnlyRootFilesystem',
          'runAsNonRoot',
          'runAsUser',
          'runAsGroup',
          'seLinuxOptions',
          'capabilities',
        ]),
        ...modeled,
        ...(modeled.seLinuxOptions
          ? {
              seLinuxOptions: {
                ...omit(original.securityContext?.seLinuxOptions, [
                  'level',
                  'role',
                  'type',
                  'user',
                ]),
                ...modeled.seLinuxOptions,
              },
            }
          : {}),
        ...(modeled.capabilities
          ? {
              capabilities: {
                ...omit(original.securityContext?.capabilities, ['add', 'drop']),
                ...modeled.capabilities,
              },
            }
          : {}),
      };
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

function mergeVolumeClaimTemplates(
  originalTemplates: Record<string, any>[] = [],
  values: PersistentVolumeClaimTemplateValues[],
) {
  return values.map((value, index) => {
    const name = trim(value.name);
    const original =
      originalTemplates.find(template => template.metadata?.name === name) ||
      originalTemplates[index] ||
      {};
    const next = cloneDeep(original);
    next.metadata = { ...(original.metadata || {}), name };
    next.spec = {
      ...(original.spec || {}),
      accessModes: cloneDeep(value.accessModes),
      resources: {
        ...(original.spec?.resources || {}),
        requests: {
          ...(original.spec?.resources?.requests || {}),
          storage: trim(value.storage),
        },
      },
    };
    if (trim(value.storageClassName)) next.spec.storageClassName = trim(value.storageClassName);
    else delete next.spec.storageClassName;
    return next;
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
  if (!validateSecurityContext(values.podSecurityContext, false)) {
    return 'WORKLOAD_SECURITY_CONTEXT_INVALID';
  }
  if (!validateWorkloadLabels(values.workloadLabels)) return 'WORKLOAD_LABELS_INVALID';
  if (!validatePodAnnotations(values.workloadAnnotations)) {
    return 'WORKLOAD_ANNOTATIONS_INVALID';
  }
  if (!validatePodAnnotations(values.podAnnotations)) return 'WORKLOAD_ANNOTATIONS_INVALID';
  if (kind === 'DaemonSet' && values.podScheduling !== undefined) {
    return 'WORKLOAD_SCHEDULING_INVALID';
  }
  if (!validatePodScheduling(values.podScheduling)) return 'WORKLOAD_SCHEDULING_INVALID';
  if (kind === 'StatefulSet' && values.volumeClaimTemplates !== undefined) {
    const volumeClaimError = validateVolumeClaimTemplates(values.volumeClaimTemplates);
    if (volumeClaimError) return volumeClaimError;
  }
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
  const reconciledVolumes = reconcileHostTimeVolume(
    nextPodSpec.volumes,
    nextPodSpec.containers,
    nextPodSpec.initContainers,
    originalPodSpec.volumes,
  );
  if (reconciledVolumes.length) nextPodSpec.volumes = reconciledVolumes;
  else delete nextPodSpec.volumes;
  const kind: WorkloadKind = original.kind || 'Deployment';
  const initial = parseDeploymentSettings(original);
  if (!isEqual(values.workloadLabels, initial.workloadLabels)) {
    if (values.workloadLabels && Object.keys(values.workloadLabels).length) {
      result.metadata.labels = cloneDeep(values.workloadLabels);
    } else delete result.metadata.labels;
  }
  if (!isEqual(values.workloadAnnotations, initial.workloadAnnotations)) {
    if (values.workloadAnnotations && Object.keys(values.workloadAnnotations).length) {
      result.metadata.annotations = cloneDeep(values.workloadAnnotations);
    } else delete result.metadata.annotations;
  }
  if (
    kind === 'StatefulSet' &&
    values.volumeClaimTemplates !== undefined &&
    !isEqual(values.volumeClaimTemplates, initial.volumeClaimTemplates)
  ) {
    const templates = mergeVolumeClaimTemplates(
      original.spec?.volumeClaimTemplates,
      values.volumeClaimTemplates,
    );
    if (templates.length) result.spec.volumeClaimTemplates = templates;
    else delete result.spec.volumeClaimTemplates;
  }
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
  if (!isEqual(values.podSecurityContext, initial.podSecurityContext)) {
    if (values.podSecurityContext) {
      const modeled = compactSecurityContext(values.podSecurityContext, false) || {};
      nextPodSpec.securityContext = {
        ...omit(originalPodSpec.securityContext, [
          'runAsNonRoot',
          'runAsUser',
          'runAsGroup',
          'seLinuxOptions',
        ]),
        ...modeled,
        ...(modeled.seLinuxOptions
          ? {
              seLinuxOptions: {
                ...omit(originalPodSpec.securityContext?.seLinuxOptions, [
                  'level',
                  'role',
                  'type',
                  'user',
                ]),
                ...modeled.seLinuxOptions,
              },
            }
          : {}),
      };
    } else delete nextPodSpec.securityContext;
  }
  if (!isEqual(values.podAnnotations, initial.podAnnotations)) {
    if (values.podAnnotations && Object.keys(values.podAnnotations).length) {
      result.spec.template.metadata.annotations = cloneDeep(values.podAnnotations);
    } else {
      delete result.spec.template.metadata.annotations;
    }
  }
  if (kind !== 'DaemonSet' && !isEqual(values.podScheduling, initial.podScheduling)) {
    if (values.podScheduling?.mode === 'preserved') return result;
    const affinity = buildPodSchedulingAffinity(
      values.podScheduling,
      result.spec.template.metadata?.labels || {},
    );
    if (affinity && Object.keys(affinity).length) nextPodSpec.affinity = affinity;
    else delete nextPodSpec.affinity;
  }
  return result;
}

export function buildDeployment(values: DeploymentCreateValues) {
  if (!validateWorkloadLabels(values.workloadLabels)) {
    throw new Error('WORKLOAD_LABELS_INVALID');
  }
  if (!validatePodAnnotations(values.workloadAnnotations)) {
    throw new Error('WORKLOAD_ANNOTATIONS_INVALID');
  }
  if (!validatePodAnnotations(values.podAnnotations)) {
    throw new Error('WORKLOAD_ANNOTATIONS_INVALID');
  }
  if (!validatePodScheduling(values.podScheduling) || values.podScheduling?.mode === 'preserved') {
    throw new Error('WORKLOAD_SCHEDULING_INVALID');
  }
  if (!validateNodeSelector(values.nodeSelector)) {
    throw new Error('WORKLOAD_NODE_SELECTOR_INVALID');
  }
  const name = trim(values.name);
  const aliasName = trim(values.aliasName);
  const description = trim(values.description);
  const annotations: Record<string, string> = cloneDeep(values.workloadAnnotations || {});
  // The current v3dist BaseInfo handler mirrors this label into the selector
  // and pod template. Keep that behavior until the application filter is
  // migrated separately.
  const labels = buildWorkloadLabels(name, values.workloadLabels);
  const containers = values.containers.map(buildContainer);
  const initContainers = values.initContainers?.map(buildContainer) || [];
  const volumes = reconcileHostTimeVolume(
    values.volumes?.map(buildVolume),
    containers,
    initContainers,
  );

  if (aliasName) annotations['kubesphere.io/alias-name'] = aliasName;
  if (description) annotations['kubesphere.io/description'] = description;

  const affinity = buildPodSchedulingAffinity(values.podScheduling, labels);

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
        metadata: {
          labels,
          ...(values.podAnnotations && Object.keys(values.podAnnotations).length
            ? { annotations: cloneDeep(values.podAnnotations) }
            : {}),
        },
        spec: {
          serviceAccountName: 'default',
          ...(compactSecurityContext(values.podSecurityContext, false)
            ? { securityContext: compactSecurityContext(values.podSecurityContext, false) }
            : {}),
          ...(affinity ? { affinity } : {}),
          ...(values.nodeSelector && Object.keys(values.nodeSelector).length
            ? { nodeSelector: cloneDeep(values.nodeSelector) }
            : {}),
          containers,
          ...(initContainers.length ? { initContainers } : {}),
          ...(volumes.length ? { volumes } : {}),
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

export function buildDaemonSet(values: WorkloadCreateValues) {
  const normalized: WorkloadCreateValues = {
    ...values,
    updateStrategy: values.updateStrategy || {
      type: 'RollingUpdate',
      maxUnavailable: '20%',
    },
    minReadySeconds: values.minReadySeconds ?? 0,
    terminationGracePeriodSeconds: values.terminationGracePeriodSeconds ?? 30,
    podScheduling: undefined,
  };
  const validationError = validateWorkloadSettings(
    { kind: 'DaemonSet', spec: {} },
    normalized as DeploymentCreateValues & Partial<WorkloadSettingsValues>,
  );
  if (validationError) throw new Error(validationError);

  const resource: Record<string, any> = buildDeployment(normalized);
  resource.kind = 'DaemonSet';
  delete resource.spec.replicas;
  delete resource.spec.strategy;
  resource.spec.minReadySeconds = normalized.minReadySeconds;
  resource.spec.updateStrategy =
    normalized.updateStrategy!.type === 'RollingUpdate'
      ? {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxUnavailable: normalized.updateStrategy!.maxUnavailable,
          },
        }
      : { type: 'OnDelete' };
  resource.spec.template.spec.terminationGracePeriodSeconds =
    normalized.terminationGracePeriodSeconds;
  return resource;
}

export function buildStatefulSetServiceName(workloadName: string, suffix: string): string {
  const name = `${trim(workloadName).slice(0, 57)}-${trim(suffix)}`;
  return /^[a-z]/.test(name) ? name : `s${name}`;
}

export function buildStatefulSet(
  values: WorkloadCreateValues,
  serviceName: string,
): { workload: Record<string, any>; service: Record<string, any> } {
  const normalized: WorkloadCreateValues = {
    ...values,
    updateStrategy: values.updateStrategy || { type: 'RollingUpdate', partition: 0 },
    terminationGracePeriodSeconds: values.terminationGracePeriodSeconds ?? 30,
    volumeClaimTemplates: values.volumeClaimTemplates || [],
  };
  const validationError = validateWorkloadSettings(
    { kind: 'StatefulSet', spec: {} },
    normalized as DeploymentCreateValues & Partial<WorkloadSettingsValues>,
  );
  if (validationError) throw new Error(validationError);
  const volumeError = validateVolumes(normalized.volumes);
  if (volumeError) throw new Error(volumeError);
  const containerError = validateContainers(
    normalized.containers,
    normalized.initContainers,
    normalized.volumes,
    normalized.volumeClaimTemplates!.map(template => template.name),
  );
  if (containerError) throw new Error(containerError);
  const normalizedServiceName = trim(serviceName);
  if (!isDnsLabel(normalizedServiceName)) throw new Error('WORKLOAD_SERVICE_NAME_INVALID');

  const workload: Record<string, any> = buildDeployment(normalized);
  workload.kind = 'StatefulSet';
  delete workload.spec.strategy;
  workload.spec.serviceName = normalizedServiceName;
  workload.spec.updateStrategy =
    normalized.updateStrategy!.type === 'RollingUpdate'
      ? {
          type: 'RollingUpdate',
          rollingUpdate: { partition: normalized.updateStrategy!.partition },
        }
      : { type: 'OnDelete' };
  workload.spec.template.spec.terminationGracePeriodSeconds =
    normalized.terminationGracePeriodSeconds;
  const volumeClaimTemplates = mergeVolumeClaimTemplates([], normalized.volumeClaimTemplates!);
  if (volumeClaimTemplates.length) workload.spec.volumeClaimTemplates = volumeClaimTemplates;

  const labels = cloneDeep(workload.spec.template.metadata.labels);
  const servicePorts = normalized.containers.flatMap(container =>
    (container.ports || []).flatMap(port =>
      port.servicePort === undefined
        ? []
        : [
            {
              ...(trim(port.name) ? { name: trim(port.name) } : {}),
              protocol: port.protocol || 'TCP',
              port: port.servicePort,
              targetPort: port.containerPort,
            },
          ],
    ),
  );
  return {
    workload,
    service: {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: normalizedServiceName,
        namespace: trim(values.namespace),
        labels: cloneDeep(workload.metadata.labels),
        annotations: {
          'kubesphere.io/alias-name': trim(values.name),
          'kubesphere.io/serviceType': 'statefulservice',
        },
      },
      spec: {
        clusterIP: 'None',
        sessionAffinity: 'None',
        selector: omit(labels, 'version'),
        ports: servicePorts,
      },
    },
  };
}
