import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeployment, validateContainers } from './deployment';

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
