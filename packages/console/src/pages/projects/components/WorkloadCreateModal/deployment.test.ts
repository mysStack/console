import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeployment,
  buildDeploymentSettingsResource,
  parseDeploymentSettings,
  validateContainers,
  validateVolumes,
} from './deployment';

test('buildDeployment creates a namespace-scoped apps/v1 deployment', () => {
  const deployment = buildDeployment({
    name: 'native-web',
    namespace: 'v4-migration-e2e',
    aliasName: 'Native Web',
    description: 'Deployment created by the native V4 form',
    replicas: 2,
    containers: [{ name: 'web', image: 'nginx:1.27-alpine', imagePullPolicy: 'IfNotPresent' }],
  });

  assert.equal(deployment.apiVersion, 'apps/v1');
  assert.equal(deployment.kind, 'Deployment');
  assert.equal(deployment.metadata.name, 'native-web');
  assert.equal(deployment.metadata.namespace, 'v4-migration-e2e');
  assert.equal(deployment.metadata.annotations['kubesphere.io/alias-name'], 'Native Web');
  assert.equal(
    deployment.metadata.annotations['kubesphere.io/description'],
    'Deployment created by the native V4 form',
  );
  assert.equal(deployment.spec.replicas, 2);
  assert.deepEqual(deployment.spec.selector.matchLabels, {
    app: 'native-web',
  });
  assert.deepEqual(deployment.spec.template.metadata.labels, {
    app: 'native-web',
  });
  assert.deepEqual(deployment.spec.template.spec.containers, [
    {
      name: 'web',
      image: 'nginx:1.27-alpine',
      imagePullPolicy: 'IfNotPresent',
    },
  ]);
  assert.equal(deployment.spec.template.spec.serviceAccountName, 'default');
  assert.equal(deployment.spec.strategy.type, 'RollingUpdate');
});

test('buildDeployment trims input and omits empty optional annotations', () => {
  const deployment = buildDeployment({
    name: '  native-web  ',
    namespace: '  v4-migration-e2e  ',
    aliasName: '   ',
    description: '',
    replicas: 0,
    containers: [{ name: '  web  ', image: '  nginx:alpine  ', imagePullPolicy: 'Always' }],
  });

  assert.equal(deployment.metadata.name, 'native-web');
  assert.equal(deployment.metadata.namespace, 'v4-migration-e2e');
  assert.deepEqual(deployment.metadata.annotations, {});
  assert.equal(deployment.spec.replicas, 0);
  assert.equal(deployment.spec.template.spec.containers[0].name, 'web');
  assert.equal(deployment.spec.template.spec.containers[0].image, 'nginx:alpine');
});

test('创建多个工作容器和初始化容器，分别保留端口和环境变量', () => {
  const deployment = buildDeployment({
    name: 'native-web',
    namespace: 'v4-migration-e2e',
    replicas: 0,
    containers: [
      {
        name: ' web ',
        image: ' nginx:alpine ',
        ports: [{ name: ' http ', containerPort: 8080, protocol: 'TCP' }],
        env: [
          { name: ' MODE ', value: '  test  ' },
          { name: 'EMPTY', value: '' },
        ],
      },
      {
        name: 'sidecar',
        image: 'busybox:stable',
        ports: [{ containerPort: 5353, protocol: 'UDP' }],
      },
    ],
    initContainers: [
      { name: 'init', image: 'busybox:stable', env: [{ name: 'INIT_ONLY', value: 'yes' }] },
    ],
  });
  assert.deepEqual(deployment.spec.template.spec.containers, [
    {
      name: 'web',
      image: 'nginx:alpine',
      imagePullPolicy: 'IfNotPresent',
      ports: [{ name: 'http', containerPort: 8080, protocol: 'TCP' }],
      env: [
        { name: 'MODE', value: '  test  ' },
        { name: 'EMPTY', value: '' },
      ],
    },
    {
      name: 'sidecar',
      image: 'busybox:stable',
      imagePullPolicy: 'IfNotPresent',
      ports: [{ containerPort: 5353, protocol: 'UDP' }],
    },
  ]);
  assert.deepEqual(deployment.spec.template.spec.initContainers, [
    {
      name: 'init',
      image: 'busybox:stable',
      imagePullPolicy: 'IfNotPresent',
      env: [{ name: 'INIT_ONLY', value: 'yes' }],
    },
  ]);
});

test('工作容器和初始化容器分别保留启动命令及参数，并省略空项', () => {
  const deployment = buildDeployment({
    name: 'native-command',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [
      {
        name: 'worker',
        image: 'busybox:1.36',
        command: [' /bin/sh ', '', '   '],
        args: [' -c ', ' printf ready >/tmp/ready; sleep 3600 '],
      },
    ],
    initContainers: [
      {
        name: 'init',
        image: 'busybox:1.36',
        command: ['/bin/sh'],
        args: ['-c', 'printf initialized >/work/marker'],
      },
    ],
  });

  assert.deepEqual(deployment.spec.template.spec.containers[0].command, ['/bin/sh']);
  assert.deepEqual(deployment.spec.template.spec.containers[0].args, [
    '-c',
    'printf ready >/tmp/ready; sleep 3600',
  ]);
  assert.deepEqual(deployment.spec.template.spec.initContainers[0].command, ['/bin/sh']);
  assert.deepEqual(deployment.spec.template.spec.initContainers[0].args, [
    '-c',
    'printf initialized >/work/marker',
  ]);

  const defaults = buildDeployment({
    name: 'native-default-command',
    namespace: 'v4-migration-e2e',
    replicas: 0,
    containers: [{ name: 'worker', image: 'busybox', command: [], args: [] }],
  });
  assert.equal('command' in defaults.spec.template.spec.containers[0], false);
  assert.equal('args' in defaults.spec.template.spec.containers[0], false);
});

test('没有初始化容器时省略字段，空环境变量值保留，不生成 Service', () => {
  const deployment = buildDeployment({
    name: 'web',
    namespace: 'test',
    replicas: 1,
    containers: [{ name: 'web', image: 'nginx', ports: [], env: [{ name: 'EMPTY' }] }],
    initContainers: [],
  });
  assert.equal('initContainers' in deployment.spec.template.spec, false);
  assert.equal('ports' in deployment.spec.template.spec.containers[0], false);
  assert.deepEqual(deployment.spec.template.spec.containers[0].env, [{ name: 'EMPTY', value: '' }]);
  assert.equal(deployment.kind, 'Deployment');
});

test('校验至少一个工作容器，以及跨工作和初始化容器的重名', () => {
  assert.equal(
    validateContainers([], [{ name: 'init', image: 'busybox' }]),
    'CONTAINER_EMPTY_DESC',
  );
  assert.equal(
    validateContainers([{ name: 'web', image: 'nginx' }], [{ name: ' web ', image: 'busybox' }]),
    'WORKLOAD_CONTAINER_DUPLICATE',
  );
  for (const container of [
    { name: 'INVALID', image: 'nginx' },
    { name: 'a'.repeat(64), image: 'nginx' },
    { name: 'web', image: ' ' },
    { name: 'web', image: 'bad image' },
  ]) {
    assert.equal(validateContainers([container]), 'WORKLOAD_CONTAINER_INVALID');
  }
});

test('环境变量按容器校验，允许空值和旧版合法名称，拒绝空名和同容器重名', () => {
  const web = { name: 'web', image: 'nginx' };
  assert.equal(
    validateContainers([
      { ...web, env: [{ name: 'A.B-C', value: '' }] },
      { name: 'sidecar', image: 'nginx', env: [{ name: 'A.B-C' }] },
    ]),
    undefined,
  );
  for (const name of ['', '1BAD', 'BAD KEY']) {
    assert.equal(validateContainers([{ ...web, env: [{ name }] }]), 'ENVIRONMENT_INVALID_TIP');
  }
  assert.equal(
    validateContainers([{ ...web, env: [{ name: 'MODE' }, { name: ' MODE ' }] }]),
    'WORKLOAD_ENV_DUPLICATE',
  );
});

test('端口校验覆盖范围、整数、协议、名称格式和跨容器名称唯一性', () => {
  const web = { name: 'web', image: 'nginx' };
  for (const containerPort of [undefined, 0, 65536, 1.5]) {
    assert.equal(
      validateContainers([{ ...web, ports: [{ containerPort }] }]),
      'WORKLOAD_PORT_INVALID',
    );
  }
  for (const name of ['INVALID', 'a'.repeat(16), '-bad', '123']) {
    assert.equal(
      validateContainers([{ ...web, ports: [{ name, containerPort: 80 }] }]),
      'WORKLOAD_PORT_INVALID',
    );
  }
  assert.equal(
    validateContainers([{ ...web, ports: [{ containerPort: 80, protocol: 'HTTP' as any }] }]),
    'WORKLOAD_PORT_INVALID',
  );
  assert.equal(
    validateContainers(
      [{ ...web, ports: [{ name: 'http', containerPort: 80 }] }],
      [{ name: 'init', image: 'busybox', ports: [{ name: 'http', containerPort: 8080 }] }],
    ),
    'WORKLOAD_PORT_DUPLICATE',
  );
  assert.equal(
    validateContainers([
      {
        ...web,
        ports: [{ containerPort: 1 }, { name: 'http', containerPort: 65535, protocol: 'SCTP' }],
      },
    ]),
    undefined,
  );
});

test('创建容器时保留健康检查、资源限制和 ConfigMap/Secret 环境引用', () => {
  const deployment = buildDeployment({
    name: 'advanced-web',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [
      {
        name: 'web',
        image: 'nginx:alpine',
        readinessProbe: {
          type: 'http',
          path: '/ready',
          port: 8080,
          scheme: 'HTTP',
          initialDelaySeconds: 2,
          timeoutSeconds: 3,
          periodSeconds: 5,
          successThreshold: 2,
          failureThreshold: 4,
        },
        livenessProbe: {
          type: 'tcp',
          port: 8080,
          initialDelaySeconds: 10,
        },
        startupProbe: {
          type: 'command',
          command: [' cat ', ' /tmp/started '],
          failureThreshold: 30,
          periodSeconds: 2,
        },
        resources: {
          requests: { cpu: '100m', memory: '64Mi' },
          limits: { cpu: '1', memory: '256Mi' },
        },
        envFrom: [
          { kind: 'configMap', name: ' app-config ', prefix: 'APP_' },
          { kind: 'secret', name: ' app-secret ' },
        ],
      },
    ],
  });

  const container = deployment.spec.template.spec.containers[0];
  assert.deepEqual(container.readinessProbe, {
    httpGet: { path: '/ready', port: 8080, scheme: 'HTTP' },
    initialDelaySeconds: 2,
    timeoutSeconds: 3,
    periodSeconds: 5,
    successThreshold: 2,
    failureThreshold: 4,
  });
  assert.deepEqual(container.livenessProbe, {
    tcpSocket: { port: 8080 },
    initialDelaySeconds: 10,
    timeoutSeconds: 1,
    periodSeconds: 10,
    successThreshold: 1,
    failureThreshold: 3,
  });
  assert.deepEqual(container.startupProbe, {
    exec: { command: ['cat', '/tmp/started'] },
    initialDelaySeconds: 0,
    timeoutSeconds: 1,
    periodSeconds: 2,
    successThreshold: 1,
    failureThreshold: 30,
  });
  assert.deepEqual(container.resources, {
    requests: { cpu: '100m', memory: '64Mi' },
    limits: { cpu: '1', memory: '256Mi' },
  });
  assert.deepEqual(container.envFrom, [
    { prefix: 'APP_', configMapRef: { name: 'app-config' } },
    { secretRef: { name: 'app-secret' } },
  ]);
});

test('创建 Deployment 时生成 PVC、临时卷、HostPath 和配置资源卷及容器挂载', () => {
  const deployment = buildDeployment({
    name: 'storage-web',
    namespace: 'v4-migration-e2e',
    replicas: 0,
    volumes: [
      { name: 'data', type: 'persistentVolumeClaim', sourceName: 'data-pvc' },
      { name: 'cache', type: 'emptyDir', medium: 'Memory', sizeLimit: '128Mi' },
      { name: 'host', type: 'hostPath', hostPath: '/var/lib/app', hostPathType: 'Directory' },
      { name: 'config', type: 'configMap', sourceName: 'app-config' },
      { name: 'secret', type: 'secret', sourceName: 'app-secret' },
    ],
    containers: [
      {
        name: 'web',
        image: 'nginx',
        volumeMounts: [
          { name: 'data', mountPath: '/data' },
          { name: 'cache', mountPath: '/cache' },
          { name: 'config', mountPath: '/etc/app', readOnly: true },
          { name: 'secret', mountPath: '/etc/secret', subPath: 'token', readOnly: true },
        ],
      },
    ],
  });

  assert.deepEqual(deployment.spec.template.spec.volumes, [
    { name: 'data', persistentVolumeClaim: { claimName: 'data-pvc' } },
    { name: 'cache', emptyDir: { medium: 'Memory', sizeLimit: '128Mi' } },
    { name: 'host', hostPath: { path: '/var/lib/app', type: 'Directory' } },
    { name: 'config', configMap: { name: 'app-config' } },
    { name: 'secret', secret: { secretName: 'app-secret' } },
  ]);
  assert.deepEqual(deployment.spec.template.spec.containers[0].volumeMounts, [
    { name: 'data', mountPath: '/data' },
    { name: 'cache', mountPath: '/cache' },
    { name: 'config', mountPath: '/etc/app', readOnly: true },
    { name: 'secret', mountPath: '/etc/secret', subPath: 'token', readOnly: true },
  ]);
});

test('高级容器设置校验拒绝无效探针、资源、配置引用和挂载', () => {
  const base = { name: 'web', image: 'nginx' };
  assert.equal(
    validateContainers([{ ...base, readinessProbe: { type: 'http', path: 'ready', port: 80 } }]),
    'WORKLOAD_PROBE_INVALID',
  );
  assert.equal(
    validateContainers([{ ...base, livenessProbe: { type: 'tcp', port: 0 } }]),
    'WORKLOAD_PROBE_INVALID',
  );
  assert.equal(
    validateContainers([{ ...base, startupProbe: { type: 'command', command: [] } }]),
    'WORKLOAD_PROBE_INVALID',
  );
  assert.equal(
    validateContainers([{ ...base, resources: { requests: { cpu: 'bad cpu' } } }]),
    'WORKLOAD_RESOURCE_INVALID',
  );
  assert.equal(
    validateContainers([{ ...base, envFrom: [{ kind: 'secret', name: '' }] }]),
    'WORKLOAD_CONFIG_REFERENCE_INVALID',
  );
  assert.equal(
    validateContainers(
      [{ ...base, volumeMounts: [{ name: 'missing', mountPath: '/data' }] }],
      [],
      [{ name: 'data', type: 'emptyDir' }],
    ),
    'WORKLOAD_VOLUME_MOUNT_INVALID',
  );
});

test('存储卷校验名称、来源、路径和唯一性', () => {
  assert.equal(validateVolumes([{ name: 'data', type: 'emptyDir' }]), undefined);
  assert.equal(
    validateVolumes([
      { name: 'data', type: 'emptyDir' },
      { name: ' data ', type: 'emptyDir' },
    ]),
    'WORKLOAD_VOLUME_DUPLICATE',
  );
  assert.equal(
    validateVolumes([{ name: 'pvc', type: 'persistentVolumeClaim', sourceName: '' }]),
    'WORKLOAD_VOLUME_INVALID',
  );
  assert.equal(
    validateVolumes([{ name: 'host', type: 'hostPath', hostPath: 'relative/path' }]),
    'WORKLOAD_VOLUME_INVALID',
  );
});

test('编辑设置读取现有容器、探针、资源和卷，并保留未暴露的 Pod 字段', () => {
  const original: any = buildDeployment({
    name: 'editable',
    namespace: 'v4-migration-e2e',
    replicas: 2,
    volumes: [{ name: 'cache', type: 'emptyDir', medium: 'Memory' }],
    containers: [
      {
        name: 'web',
        image: 'nginx:1.27',
        readinessProbe: { type: 'http', path: '/ready', port: 8080 },
        resources: { limits: { cpu: '1', memory: '256Mi' } },
        volumeMounts: [{ name: 'cache', mountPath: '/cache' }],
      },
    ],
  });
  original.spec.template.spec.nodeSelector = { role: 'worker' };
  original.spec.template.spec.containers[0].securityContext = { runAsNonRoot: true };
  original.spec.template.spec.containers[0].env = [
    { name: 'VISIBLE', value: 'one' },
    { name: 'PASSWORD', valueFrom: { secretKeyRef: { name: 'db', key: 'password' } } },
  ];
  original.spec.template.spec.containers[0].ports = [
    { name: 'http', containerPort: 8080, protocol: 'TCP', hostPort: 18080 },
  ];
  original.spec.template.spec.containers[0].resources.requests = {
    cpu: '100m',
    'ephemeral-storage': '1Gi',
  };

  const values = parseDeploymentSettings(original);
  assert.equal(values.name, 'editable');
  assert.equal(values.replicas, 2);
  assert.equal(values.containers[0].readinessProbe?.type, 'http');
  assert.equal(values.containers[0].resources?.limits?.memory, '256Mi');
  assert.equal(values.volumes?.[0].type, 'emptyDir');

  values.containers[0].image = 'nginx:1.28';
  values.containers[0].readinessProbe = undefined;
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.equal(submitted.spec.template.spec.containers[0].image, 'nginx:1.28');
  assert.equal('readinessProbe' in submitted.spec.template.spec.containers[0], false);
  assert.deepEqual(submitted.spec.template.spec.containers[0].securityContext, {
    runAsNonRoot: true,
  });
  assert.deepEqual(submitted.spec.template.spec.containers[0].env, [
    { name: 'VISIBLE', value: 'one' },
    { name: 'PASSWORD', valueFrom: { secretKeyRef: { name: 'db', key: 'password' } } },
  ]);
  assert.equal(submitted.spec.template.spec.containers[0].ports[0].hostPort, 18080);
  assert.equal(
    submitted.spec.template.spec.containers[0].resources.requests['ephemeral-storage'],
    '1Gi',
  );
  assert.deepEqual(submitted.spec.template.spec.nodeSelector, { role: 'worker' });
  assert.equal(submitted.metadata.resourceVersion, undefined);
  assert.equal(submitted.status, undefined);
});

test('编辑设置解析 Kubernetes 原生三类探针和五类卷', () => {
  const original: any = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'native', namespace: 'v4-migration-e2e', resourceVersion: '10' },
    status: { readyReplicas: 1 },
    spec: {
      replicas: 1,
      template: {
        metadata: { labels: { app: 'native' } },
        spec: {
          containers: [
            {
              name: 'web',
              image: 'nginx',
              readinessProbe: { httpGet: { path: '/ready', port: 8080, scheme: 'HTTPS' } },
              livenessProbe: { tcpSocket: { port: 8080 } },
              startupProbe: { exec: { command: ['test', '-f', '/tmp/ready'] } },
              envFrom: [
                { prefix: 'APP_', configMapRef: { name: 'app-config' } },
                { secretRef: { name: 'app-secret' } },
              ],
            },
          ],
          volumes: [
            { name: 'pvc', persistentVolumeClaim: { claimName: 'claim' } },
            { name: 'tmp', emptyDir: { sizeLimit: '1Gi' } },
            { name: 'host', hostPath: { path: '/data', type: 'Directory' } },
            { name: 'cfg', configMap: { name: 'app-config' } },
            { name: 'sec', secret: { secretName: 'app-secret' } },
          ],
        },
      },
    },
  };
  const values = parseDeploymentSettings(original);
  assert.deepEqual(
    values.containers.map(container => [
      container.readinessProbe?.type,
      container.livenessProbe?.type,
      container.startupProbe?.type,
    ]),
    [['http', 'tcp', 'command']],
  );
  assert.deepEqual(values.containers[0].envFrom, [
    { kind: 'configMap', name: 'app-config', prefix: 'APP_' },
    { kind: 'secret', name: 'app-secret', prefix: undefined },
  ]);
  assert.deepEqual(
    values.volumes?.map(volume => volume.type),
    ['persistentVolumeClaim', 'emptyDir', 'hostPath', 'configMap', 'secret'],
  );
});
