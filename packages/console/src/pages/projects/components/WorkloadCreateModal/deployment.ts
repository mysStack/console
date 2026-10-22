export interface ContainerPortValues {
  name?: string;
  containerPort?: number;
  protocol?: 'TCP' | 'UDP' | 'SCTP';
}

export interface EnvironmentValues {
  name: string;
  value?: string;
}

export interface ContainerCreateValues {
  name: string;
  image: string;
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  command?: string[];
  args?: string[];
  ports?: ContainerPortValues[];
  env?: EnvironmentValues[];
}

export interface DeploymentCreateValues {
  name: string;
  namespace: string;
  aliasName?: string;
  description?: string;
  replicas: number;
  containers: ContainerCreateValues[];
  initContainers?: ContainerCreateValues[];
}

const trim = (value = '') => value.trim();

export function validateContainers(
  containers: ContainerCreateValues[] = [],
  initContainers: ContainerCreateValues[] = [],
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
  }
}

function buildContainer(container: ContainerCreateValues) {
  const command = container.command?.map(trim).filter(Boolean);
  const args = container.args?.map(trim).filter(Boolean);
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
  };
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
