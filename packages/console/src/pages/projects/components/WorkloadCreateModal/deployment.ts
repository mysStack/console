export interface DeploymentCreateValues {
  name: string;
  namespace: string;
  aliasName?: string;
  description?: string;
  replicas: number;
  containerName: string;
  image: string;
  imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';
}

const trim = (value = '') => value.trim();

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
          containers: [
            {
              name: trim(values.containerName),
              image: trim(values.image),
              imagePullPolicy: values.imagePullPolicy,
            },
          ],
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
