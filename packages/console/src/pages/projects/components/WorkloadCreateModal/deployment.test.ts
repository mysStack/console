import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDaemonSet,
  buildDeployment,
  buildStatefulSet,
  buildStatefulSetServiceName,
  checkWorkloadLabelsAvailability,
  buildDeploymentSettingsResource,
  parseDeploymentSettings,
  validateNodeSelector,
  validatePodAnnotations,
  validatePodScheduling,
  validateWorkloadLabels,
  validateContainers,
  validateVolumes,
  validateVolumeClaimTemplates,
} from './deployment';

const cloneTestResource = <T>(value: T): T => structuredClone(value);

test('buildDaemonSet 创建无 replicas 的原生 DaemonSet 并保留资源特有策略', () => {
  const daemonSet = buildDaemonSet({
    name: 'native-agent',
    namespace: 'v4-migration-e2e',
    replicas: 9,
    containers: [{ name: 'agent', image: 'busybox:1.36' }],
    updateStrategy: { type: 'RollingUpdate', maxUnavailable: '20%' },
    minReadySeconds: 3,
    terminationGracePeriodSeconds: 15,
    nodeSelector: { 'kubernetes.io/os': 'linux' },
  });

  assert.equal(daemonSet.apiVersion, 'apps/v1');
  assert.equal(daemonSet.kind, 'DaemonSet');
  assert.equal(daemonSet.metadata.name, 'native-agent');
  assert.equal('replicas' in daemonSet.spec, false);
  assert.deepEqual(daemonSet.spec.updateStrategy, {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: '20%' },
  });
  assert.equal(daemonSet.spec.minReadySeconds, 3);
  assert.equal(daemonSet.spec.template.spec.terminationGracePeriodSeconds, 15);
  assert.deepEqual(daemonSet.spec.template.spec.nodeSelector, {
    'kubernetes.io/os': 'linux',
  });
});

test('buildDaemonSet 支持 OnDelete 并拒绝 Deployment 策略字段', () => {
  const daemonSet = buildDaemonSet({
    name: 'native-agent',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [{ name: 'agent', image: 'busybox:1.36' }],
    updateStrategy: { type: 'OnDelete' },
    minReadySeconds: 0,
    terminationGracePeriodSeconds: 30,
  });
  assert.deepEqual(daemonSet.spec.updateStrategy, { type: 'OnDelete' });

  assert.throws(
    () =>
      buildDaemonSet({
        name: 'invalid-agent',
        namespace: 'v4-migration-e2e',
        replicas: 1,
        containers: [{ name: 'agent', image: 'busybox:1.36' }],
        updateStrategy: { type: 'Recreate' },
        minReadySeconds: 0,
        terminationGracePeriodSeconds: 30,
      }),
    /WORKLOAD_SETTINGS_INVALID/,
  );
});

test('buildStatefulSet 同时生成有状态副本集和配套 Headless Service', () => {
  const resources = buildStatefulSet(
    {
      name: 'native-db',
      namespace: 'v4-migration-e2e',
      replicas: 2,
      containers: [
        {
          name: 'database',
          image: 'postgres:16',
          ports: [{ name: 'sql', containerPort: 5432, servicePort: 15432, protocol: 'TCP' }],
          volumeMounts: [{ name: 'data', mountPath: '/var/lib/postgresql/data' }],
        },
      ],
      workloadLabels: { tier: 'database' },
      updateStrategy: { type: 'RollingUpdate', partition: 1 },
      terminationGracePeriodSeconds: 45,
      volumeClaimTemplates: [
        {
          name: 'data',
          accessModes: ['ReadWriteOnce'],
          storage: '2Gi',
          storageClassName: 'local-path',
        },
      ],
    },
    'native-db-ab12',
  );

  assert.deepEqual(resources.workload, {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: {
      name: 'native-db',
      namespace: 'v4-migration-e2e',
      annotations: {},
      labels: { tier: 'database', app: 'native-db' },
    },
    spec: {
      replicas: 2,
      selector: { matchLabels: { tier: 'database', app: 'native-db' } },
      template: {
        metadata: { labels: { tier: 'database', app: 'native-db' } },
        spec: {
          serviceAccountName: 'default',
          containers: [
            {
              name: 'database',
              image: 'postgres:16',
              imagePullPolicy: 'IfNotPresent',
              ports: [{ name: 'sql', containerPort: 5432, protocol: 'TCP' }],
              volumeMounts: [{ name: 'data', mountPath: '/var/lib/postgresql/data' }],
            },
          ],
          terminationGracePeriodSeconds: 45,
        },
      },
      serviceName: 'native-db-ab12',
      updateStrategy: { type: 'RollingUpdate', rollingUpdate: { partition: 1 } },
      volumeClaimTemplates: [
        {
          metadata: { name: 'data' },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: { requests: { storage: '2Gi' } },
            storageClassName: 'local-path',
          },
        },
      ],
    },
  });
  assert.deepEqual(resources.service, {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'native-db-ab12',
      namespace: 'v4-migration-e2e',
      labels: { tier: 'database', app: 'native-db' },
      annotations: {
        'kubesphere.io/alias-name': 'native-db',
        'kubesphere.io/serviceType': 'statefulservice',
      },
    },
    spec: {
      clusterIP: 'None',
      sessionAffinity: 'None',
      selector: { tier: 'database', app: 'native-db' },
      ports: [{ name: 'sql', protocol: 'TCP', port: 15432, targetPort: 5432 }],
    },
  });
});

test('StatefulSet Service 名称遵循 V3 截断和字母前缀规则', () => {
  assert.equal(buildStatefulSetServiceName('native-db', 'ab12'), 'native-db-ab12');
  assert.equal(
    buildStatefulSetServiceName(`9${'a'.repeat(70)}`, 'xy89'),
    `s9${'a'.repeat(56)}-xy89`,
  );
});

test('buildStatefulSet 拒绝非法 Service 端口且支持 OnDelete', () => {
  assert.throws(
    () =>
      buildStatefulSet(
        {
          name: 'invalid-db',
          namespace: 'v4-migration-e2e',
          replicas: 1,
          containers: [
            {
              name: 'database',
              image: 'postgres:16',
              ports: [{ containerPort: 5432, servicePort: 0 }],
            },
          ],
          updateStrategy: { type: 'RollingUpdate', partition: 0 },
          terminationGracePeriodSeconds: 30,
        },
        'invalid-db-ab12',
      ),
    /WORKLOAD_PORT_INVALID/,
  );
  const resources = buildStatefulSet(
    {
      name: 'on-delete-db',
      namespace: 'v4-migration-e2e',
      replicas: 1,
      containers: [{ name: 'database', image: 'postgres:16' }],
      updateStrategy: { type: 'OnDelete' },
      terminationGracePeriodSeconds: 30,
    },
    'on-delete-db-ab12',
  );
  assert.deepEqual(resources.workload.spec.updateStrategy, { type: 'OnDelete' });
});

for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
  test(`${kind} 生命周期回填、修改和清空保留其他容器字段及未编辑动作`, () => {
    const original = {
      apiVersion: 'apps/v1',
      kind,
      metadata: { name: 'lifecycle-test', namespace: 'v4-migration-e2e', resourceVersion: '42' },
      spec: {
        replicas: 1,
        template: {
          spec: {
            containers: [
              {
                name: 'web',
                image: 'nginx:alpine',
                securityContext: { runAsNonRoot: true },
                lifecycle: {
                  postStart: {
                    httpGet: {
                      path: '/warm',
                      port: 8080,
                      scheme: 'HTTPS',
                      host: '127.0.0.1',
                      httpHeaders: [{ name: 'X-Check', value: 'warm' }],
                    },
                  },
                  preStop: { exec: { command: ['/bin/sh', '-c', 'sleep 2'] } },
                },
              },
            ],
          },
        },
      },
    };
    const values = parseDeploymentSettings(original);
    assert.deepEqual(values.containers[0].lifecycle, {
      postStart: { type: 'http', path: '/warm', port: 8080, scheme: 'HTTPS' },
      preStop: { type: 'command', command: ['/bin/sh', '-c', 'sleep 2'] },
    });
    assert.deepEqual(
      buildDeploymentSettingsResource(original, values).spec.template.spec.containers,
      original.spec.template.spec.containers,
    );
    values.containers[0].lifecycle!.postStart!.path = '/ready';
    let saved = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(saved.spec.template.spec.containers[0].lifecycle.postStart, {
      httpGet: {
        path: '/ready',
        port: 8080,
        scheme: 'HTTPS',
        host: '127.0.0.1',
        httpHeaders: [{ name: 'X-Check', value: 'warm' }],
      },
    });
    values.containers[0].lifecycle!.postStart = { type: 'command', command: ['echo', 'started'] };
    saved = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(saved.spec.template.spec.containers[0].lifecycle.postStart, {
      exec: { command: ['echo', 'started'] },
    });
    assert.deepEqual(
      saved.spec.template.spec.containers[0].lifecycle.preStop,
      original.spec.template.spec.containers[0].lifecycle.preStop,
    );
    values.containers[0].lifecycle = undefined;
    saved = buildDeploymentSettingsResource(original, values);
    assert.equal('lifecycle' in saved.spec.template.spec.containers[0], false);
    assert.deepEqual(saved.spec.template.spec.containers[0].securityContext, {
      runAsNonRoot: true,
    });
    assert.equal(
      original.spec.template.spec.containers[0].lifecycle.postStart.httpGet.path,
      '/warm',
    );
    assert.equal(saved.metadata.resourceVersion, '42');
  });
}

test('创建时生命周期只写 handler，不写健康检查 timing', () => {
  const resource = buildDeployment({
    name: 'lifecycle-create',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [
      {
        name: 'web',
        image: 'nginx:alpine',
        lifecycle: {
          postStart: { type: 'http', path: '/ready', port: 8080, scheme: 'HTTPS' },
          preStop: { type: 'command', command: ['/bin/sh', '-c', 'sleep 2'] },
        },
      },
    ],
  });
  assert.deepEqual(resource.spec.template.spec.containers[0].lifecycle, {
    postStart: { httpGet: { path: '/ready', port: 8080, scheme: 'HTTPS' } },
    preStop: { exec: { command: ['/bin/sh', '-c', 'sleep 2'] } },
  });
});

test('生命周期拒绝空命令、非法路径和非法端口', () => {
  for (const action of [
    { type: 'command', command: [] },
    { type: 'command', command: ['  '] },
    { type: 'http', path: 'relative', port: 80 },
    { type: 'tcp', port: 0 },
    { type: 'http', path: '/', port: 65536 },
  ]) {
    assert.equal(
      validateContainers([
        { name: 'web', image: 'nginx:alpine', lifecycle: { preStop: action as any } },
      ]),
      'WORKLOAD_LIFECYCLE_INVALID',
    );
  }
  assert.equal(
    validateContainers([
      {
        name: 'web',
        image: 'nginx:alpine',
        lifecycle: { postStart: { type: 'http', path: '/', port: 80 } },
      },
    ]),
    undefined,
  );
  assert.equal(
    validateContainers(
      [{ name: 'web', image: 'nginx:alpine' }],
      [{ name: 'init', image: 'busybox', lifecycle: { preStop: { type: 'tcp', port: 1234 } } }],
    ),
    'WORKLOAD_LIFECYCLE_INVALID',
  );
});

test('生命周期 exec 保留空参数和参数首尾空格，拒绝空可执行文件和错误 HTTP 协议', () => {
  const resource = buildDeployment({
    name: 'lifecycle-command',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [
      {
        name: 'web',
        image: 'busybox',
        lifecycle: { preStop: { type: 'command', command: ['printf', '  keep  ', ''] } },
      },
    ],
  });
  assert.deepEqual(resource.spec.template.spec.containers[0].lifecycle.preStop.exec.command, [
    'printf',
    '  keep  ',
    '',
  ]);
  assert.equal(
    validateContainers([
      {
        name: 'web',
        image: 'busybox',
        lifecycle: { preStop: { type: 'command', command: ['  ', 'sleep'] } },
      },
    ]),
    'WORKLOAD_LIFECYCLE_INVALID',
  );
  assert.equal(
    validateContainers([
      {
        name: 'web',
        image: 'busybox',
        lifecycle: { preStop: { type: 'http', path: '/', port: 80, scheme: 'FTP' as any } },
      },
    ]),
    'WORKLOAD_LIFECYCLE_INVALID',
  );
});

test('已存在的 restartable init 容器保留 restartPolicy 并允许编辑生命周期', () => {
  const original = {
    kind: 'Deployment',
    metadata: { name: 'sidecar-life' },
    spec: {
      replicas: 1,
      template: {
        spec: {
          containers: [{ name: 'web', image: 'nginx:alpine' }],
          initContainers: [
            {
              name: 'sidecar',
              image: 'busybox',
              restartPolicy: 'Always',
              lifecycle: { preStop: { exec: { command: ['sleep', '2'] } } },
            },
          ],
        },
      },
    },
  };
  const values = parseDeploymentSettings(original);
  assert.equal(values.initContainers![0].restartPolicy, 'Always');
  assert.equal(validateContainers(values.containers, values.initContainers), undefined);
  values.initContainers![0].lifecycle!.preStop = { type: 'command', command: ['sleep', '3'] };
  const saved = buildDeploymentSettingsResource(original, values);
  assert.equal(saved.spec.template.spec.initContainers[0].restartPolicy, 'Always');
  assert.deepEqual(saved.spec.template.spec.initContainers[0].lifecycle.preStop.exec.command, [
    'sleep',
    '3',
  ]);
});

test('修改一个生命周期动作时保留另一个未建模的动作，显式清除已建模动作', () => {
  const original = {
    kind: 'Deployment',
    metadata: { name: 'future-life' },
    spec: {
      replicas: 1,
      template: {
        spec: {
          containers: [
            {
              name: 'web',
              image: 'nginx:alpine',
              lifecycle: {
                postStart: { sleep: { seconds: 2 } },
                preStop: { exec: { command: ['sleep', '2'] } },
              },
            },
          ],
        },
      },
    },
  };
  const values = parseDeploymentSettings(original);
  values.containers[0].lifecycle!.preStop = { type: 'command', command: ['sleep', '3'] };
  const changed = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(changed.spec.template.spec.containers[0].lifecycle.postStart, {
    sleep: { seconds: 2 },
  });
  values.containers[0].lifecycle!.preStop = undefined;
  assert.deepEqual(
    buildDeploymentSettingsResource(original, values).spec.template.spec.containers[0].lifecycle,
    { postStart: { sleep: { seconds: 2 } } },
  );
});

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

test('创建 Deployment 同步工作负载标签、选择器、Pod 标签和顶层注解', () => {
  const deployment = buildDeployment({
    name: 'native-metadata',
    namespace: 'v4-migration-e2e',
    aliasName: '系统别名',
    replicas: 1,
    workloadLabels: {
      app: 'cannot-override-name',
      tier: 'frontend',
      'example.com/track': '',
    },
    workloadAnnotations: {
      'example.com/owner': 'migration',
      'kubesphere.io/alias-name': 'cannot-override-alias',
    },
    containers: [{ name: 'web', image: 'nginx:alpine' }],
  });

  const labels = {
    app: 'native-metadata',
    tier: 'frontend',
    'example.com/track': '',
  };
  assert.deepEqual(deployment.metadata.labels, labels);
  assert.deepEqual(deployment.spec.selector.matchLabels, labels);
  assert.deepEqual(deployment.spec.template.metadata.labels, labels);
  assert.deepEqual(deployment.metadata.annotations, {
    'example.com/owner': 'migration',
    'kubesphere.io/alias-name': '系统别名',
  });
});

test('工作负载标签和顶层注解拒绝非法 Kubernetes 元数据', () => {
  assert.equal(validateWorkloadLabels({ tier: 'frontend', 'example.com/track': '' }), true);
  assert.equal(validateWorkloadLabels({ '/tier': 'frontend' }), false);
  assert.equal(validateWorkloadLabels({ tier: 'a'.repeat(64) }), false);
  assert.throws(
    () =>
      buildDeployment({
        name: 'invalid-metadata',
        namespace: 'v4-migration-e2e',
        replicas: 1,
        workloadAnnotations: { '/owner': 'migration' },
        containers: [{ name: 'web', image: 'nginx:alpine' }],
      }),
    /WORKLOAD_ANNOTATIONS_INVALID/,
  );
});

test('工作负载标签重复检查绑定当前 cluster/namespace 并区分重复与请求失败', async () => {
  let requested: Record<string, any> | undefined;
  const duplicate = await checkWorkloadLabelsAvailability(
    async params => {
      requested = params;
      return { exist: true };
    },
    {
      cluster: 'host',
      namespace: 'v4-migration-e2e',
      name: 'native-metadata',
      labels: { tier: 'frontend' },
    },
  );
  assert.equal(duplicate, 'DUPLICATE_LABELS');
  assert.deepEqual(requested, {
    cluster: 'host',
    namespace: 'v4-migration-e2e',
    labels: { tier: 'frontend', app: 'native-metadata' },
  });
  assert.equal(
    await checkWorkloadLabelsAvailability(async () => ({ exist: false }), {
      cluster: 'host',
      namespace: 'v4-migration-e2e',
      name: 'native-metadata',
    }),
    undefined,
  );
  assert.equal(
    await checkWorkloadLabelsAvailability(async () => Promise.reject(new Error('network')), {
      cluster: 'host',
      namespace: 'v4-migration-e2e',
      name: 'native-metadata',
    }),
    'WORKLOAD_LABEL_CHECK_FAILED',
  );
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

test('创建工作负载时按容器宿主时区开关补齐只读挂载和 host-time 卷', () => {
  const deployment = buildDeployment({
    name: 'timezone-web',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    containers: [
      {
        name: 'web',
        image: 'nginx',
        volumeMounts: [{ name: 'host-time', mountPath: '/etc/localtime', readOnly: true }],
      },
    ],
  });

  assert.deepEqual(deployment.spec.template.spec.containers[0].volumeMounts, [
    { name: 'host-time', mountPath: '/etc/localtime', readOnly: true },
  ]);
  assert.deepEqual(deployment.spec.template.spec.volumes, [
    { name: 'host-time', hostPath: { path: '/etc/localtime', type: '' } },
  ]);
});

test('编辑宿主时区挂载时隐藏系统卷，并按全部容器状态增删 host-time 卷', () => {
  const original: any = {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: { name: 'timezone-sts', namespace: 'v4-migration-e2e', resourceVersion: '42' },
    spec: {
      replicas: 1,
      serviceName: 'timezone-sts',
      selector: { matchLabels: { app: 'timezone-sts' } },
      template: {
        metadata: { labels: { app: 'timezone-sts' } },
        spec: {
          containers: [
            {
              name: 'web',
              image: 'nginx',
              volumeMounts: [{ name: 'host-time', mountPath: '/etc/localtime', readOnly: true }],
            },
            {
              name: 'sidecar',
              image: 'busybox',
              volumeMounts: [{ name: 'host-time', mountPath: '/etc/localtime', readOnly: true }],
            },
          ],
          volumes: [
            { name: 'host-time', hostPath: { path: '/etc/localtime', type: '' } },
            { name: 'data', emptyDir: {} },
          ],
        },
      },
      updateStrategy: { type: 'RollingUpdate', rollingUpdate: { partition: 0 } },
    },
  };

  const values = parseDeploymentSettings(original);
  assert.deepEqual(
    values.volumes?.map(volume => volume.name),
    ['data'],
  );
  const unchanged = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(unchanged.spec.template.spec.volumes, original.spec.template.spec.volumes);

  values.containers[0].volumeMounts = [];
  const oneEnabled = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(oneEnabled.spec.template.spec.volumes, original.spec.template.spec.volumes);

  values.containers[1].volumeMounts = [];
  const disabled = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(disabled.spec.template.spec.volumes, [{ name: 'data', emptyDir: {} }]);
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

test('编辑其他设置不丢失 projected 卷、命名端口探针和 HTTP 头', () => {
  const original: any = {
    metadata: { name: 'preserve', namespace: 'v4-migration-e2e', resourceVersion: '42' },
    spec: {
      replicas: 0,
      template: {
        spec: {
          containers: [
            {
              name: 'web',
              image: 'nginx',
              readinessProbe: {
                httpGet: {
                  path: '/',
                  port: 'http',
                  httpHeaders: [{ name: 'X-Probe', value: 'check' }],
                },
                timeoutSeconds: 2,
              },
              volumeMounts: [{ name: 'runtime', mountPath: '/runtime', readOnly: true }],
            },
          ],
          volumes: [
            {
              name: 'runtime',
              projected: {
                sources: [
                  {
                    downwardAPI: {
                      items: [{ path: 'namespace', fieldRef: { fieldPath: 'metadata.namespace' } }],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };
  const before = JSON.parse(JSON.stringify(original));
  const values = parseDeploymentSettings(original);
  assert.equal(values.volumes?.length, 1);
  assert.equal(
    validateContainers(values.containers, values.initContainers, values.volumes),
    undefined,
  );
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted, before);
  values.containers[0].readinessProbe!.path = '/health';
  const edited = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(edited.spec.template.spec.containers[0].readinessProbe.httpGet, {
    path: '/health',
    port: 'http',
    scheme: 'HTTP',
    httpHeaders: [{ name: 'X-Probe', value: 'check' }],
  });
  assert.deepEqual(original, before);
});

test('编辑设置允许关闭只读和清空 subPath、envFrom prefix 与 emptyDir 容量', () => {
  const original: any = {
    metadata: { name: 'clear', namespace: 'v4-migration-e2e' },
    spec: {
      replicas: 0,
      template: {
        spec: {
          containers: [
            {
              name: 'web',
              image: 'nginx',
              volumeMounts: [
                {
                  name: 'cache',
                  mountPath: '/data',
                  readOnly: true,
                  subPath: 'logs',
                  mountPropagation: 'None',
                },
              ],
              envFrom: [{ prefix: 'OLD_', configMapRef: { name: 'config', optional: true } }],
            },
          ],
          volumes: [{ name: 'cache', emptyDir: { medium: 'Memory', sizeLimit: '128Mi' } }],
        },
      },
    },
  };
  const values = parseDeploymentSettings(original);
  values.containers[0].volumeMounts![0] = {
    name: 'cache',
    mountPath: '/data',
    readOnly: false,
    subPath: '',
  };
  values.containers[0].envFrom![0].prefix = '';
  values.volumes![0] = { name: 'cache', type: 'emptyDir', medium: '', sizeLimit: '' };
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.template.spec.containers[0].volumeMounts, [
    { name: 'cache', mountPath: '/data', mountPropagation: 'None' },
  ]);
  assert.deepEqual(submitted.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'config', optional: true } },
  ]);
  assert.deepEqual(submitted.spec.template.spec.volumes, [{ name: 'cache', emptyDir: {} }]);
});

// 三类资源共用设置转换，但不能把 Deployment 的 replicas/strategy 写给 STS/DS。
function settingsFixture(kind: string): any {
  return {
    apiVersion: 'apps/v1',
    kind,
    metadata: { name: 'native-settings', namespace: 'v4-migration-e2e', resourceVersion: '42' },
    spec: {
      ...(kind === 'DaemonSet' ? {} : { replicas: 2 }),
      selector: { matchLabels: { app: 'native-settings' } },
      template: {
        metadata: { labels: { app: 'native-settings' } },
        spec: { containers: [{ name: 'web', image: 'nginx' }], terminationGracePeriodSeconds: 30 },
      },
    },
  };
}

test('DaemonSet 编辑容器不引入 replicas，保留更新策略和 resourceVersion', () => {
  const original = settingsFixture('DaemonSet');
  original.spec.updateStrategy = {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 1, maxSurge: 0 },
  };
  original.spec.minReadySeconds = 0;
  const values = parseDeploymentSettings(original);
  values.containers[0].image = 'nginx:alpine';
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.equal('replicas' in submitted.spec, false);
  assert.equal('strategy' in submitted.spec, false);
  assert.deepEqual(submitted.spec.updateStrategy, {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 1, maxSurge: 0 },
  });
  assert.equal(submitted.metadata.resourceVersion, '42');
  assert.equal(submitted.spec.template.spec.containers[0].image, 'nginx:alpine');
  assert.equal(original.spec.template.spec.containers[0].image, 'nginx');
});

test('Deployment 更新策略支持数量、百分比及切换 Recreate 时清除 rollingUpdate', () => {
  const original = settingsFixture('Deployment');
  original.spec.strategy = {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: '25%', maxSurge: '25%' },
  };
  const values = parseDeploymentSettings(original);
  assert.equal(values.updateStrategy?.type, 'RollingUpdate');
  values.updateStrategy = { type: 'RollingUpdate', maxUnavailable: '2', maxSurge: '30%' };
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.strategy, {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 2, maxSurge: '30%' },
  });
  assert.equal('updateStrategy' in submitted.spec, false);
  values.updateStrategy.type = 'Recreate';
  assert.deepEqual(buildDeploymentSettingsResource(original, values).spec.strategy, {
    type: 'Recreate',
  });
  assert.equal(original.spec.strategy.rollingUpdate.maxUnavailable, '25%');
});

test('StatefulSet 策略保留 Service、PVC 模板及未编辑的滚动更新字段', () => {
  const original = settingsFixture('StatefulSet');
  original.spec.serviceName = 'headless';
  original.spec.volumeClaimTemplates = [
    {
      metadata: { name: 'data' },
      spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } },
    },
  ];
  original.spec.updateStrategy = {
    type: 'RollingUpdate',
    rollingUpdate: { partition: 0, maxUnavailable: '10%' },
  };
  const values = parseDeploymentSettings(original);
  assert.equal(values.updateStrategy?.partition, 0);
  values.updateStrategy = { type: 'RollingUpdate', partition: 1 };
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.updateStrategy, {
    type: 'RollingUpdate',
    rollingUpdate: { partition: 1, maxUnavailable: '10%' },
  });
  assert.equal(submitted.spec.serviceName, 'headless');
  assert.deepEqual(submitted.spec.volumeClaimTemplates, original.spec.volumeClaimTemplates);
  assert.equal('strategy' in submitted.spec, false);
  values.updateStrategy.type = 'OnDelete';
  assert.deepEqual(buildDeploymentSettingsResource(original, values).spec.updateStrategy, {
    type: 'OnDelete',
  });
});

test('StatefulSet 回填并保存 PVC 模板的可编辑字段，同时保留未建模字段', () => {
  const original = settingsFixture('StatefulSet');
  original.spec.volumeClaimTemplates = [
    {
      metadata: { name: 'data', labels: { 'example.com/keep': 'yes' } },
      spec: {
        accessModes: ['ReadWriteOnce'],
        storageClassName: 'fast.csi.example.com',
        volumeMode: 'Filesystem',
        resources: { requests: { storage: '1Gi', 'example.com/keep': '1' } },
      },
    },
  ];
  const values = parseDeploymentSettings(original);
  assert.deepEqual(values.volumeClaimTemplates, [
    {
      name: 'data',
      accessModes: ['ReadWriteOnce'],
      storageClassName: 'fast.csi.example.com',
      storage: '1Gi',
    },
  ]);
  values.volumeClaimTemplates![0] = {
    name: 'data',
    accessModes: ['ReadWriteMany'],
    storageClassName: 'slow.csi.example.com',
    storage: '2Gi',
  };
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.volumeClaimTemplates, [
    {
      metadata: { name: 'data', labels: { 'example.com/keep': 'yes' } },
      spec: {
        accessModes: ['ReadWriteMany'],
        storageClassName: 'slow.csi.example.com',
        volumeMode: 'Filesystem',
        resources: { requests: { storage: '2Gi', 'example.com/keep': '1' } },
      },
    },
  ]);
});

test('StatefulSet PVC 模板校验名称、访问模式、容量和重复项', () => {
  const valid = [{ name: 'data', accessModes: ['ReadWriteOnce'], storage: '1Gi' }];
  assert.equal(validateVolumeClaimTemplates(valid), undefined);
  assert.equal(
    validateVolumeClaimTemplates([{ ...valid[0], name: 'Bad_Name' }]),
    'WORKLOAD_VOLUME_CLAIM_INVALID',
  );
  assert.equal(
    validateVolumeClaimTemplates([{ ...valid[0], accessModes: [] }]),
    'WORKLOAD_VOLUME_CLAIM_INVALID',
  );
  assert.equal(
    validateVolumeClaimTemplates([{ ...valid[0], storage: '0Gi' }]),
    'WORKLOAD_VOLUME_CLAIM_INVALID',
  );
  assert.equal(
    validateVolumeClaimTemplates([valid[0], { ...valid[0] }]),
    'WORKLOAD_VOLUME_CLAIM_DUPLICATE',
  );
});

test('DaemonSet 策略独立写入 minReadySeconds，并保留 maxSurge', () => {
  const original = settingsFixture('DaemonSet');
  original.spec.updateStrategy = {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 1, maxSurge: 0 },
  };
  original.spec.minReadySeconds = 0;
  const values = parseDeploymentSettings(original);
  assert.equal(values.updateStrategy?.maxUnavailable, 1);
  assert.equal(values.minReadySeconds, 0);
  values.updateStrategy = { type: 'RollingUpdate', maxUnavailable: '20%' };
  values.minReadySeconds = 5;
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.updateStrategy, {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: '20%', maxSurge: 0 },
  });
  assert.equal(submitted.spec.minReadySeconds, 5);
  assert.equal('replicas' in submitted.spec, false);
  values.updateStrategy.type = 'OnDelete';
  assert.deepEqual(buildDeploymentSettingsResource(original, values).spec.updateStrategy, {
    type: 'OnDelete',
  });
});

test('优雅终止允许显式零值，未编辑的 Pod 调度与安全字段完整保留', () => {
  for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
    const original = settingsFixture(kind);
    original.spec.template.spec.affinity = {
      nodeAffinity: { preferredDuringSchedulingIgnoredDuringExecution: [] },
    };
    original.spec.template.spec.securityContext = { runAsNonRoot: true };
    const values = parseDeploymentSettings(original);
    if (kind !== 'DaemonSet') assert.equal(values.podScheduling?.mode, 'preserved');
    assert.equal(values.terminationGracePeriodSeconds, 30);
    values.terminationGracePeriodSeconds = 0;
    const submitted = buildDeploymentSettingsResource(original, values);
    assert.equal(submitted.spec.template.spec.terminationGracePeriodSeconds, 0);
    assert.deepEqual(submitted.spec.template.spec.affinity, original.spec.template.spec.affinity);
    assert.deepEqual(submitted.spec.template.spec.securityContext, { runAsNonRoot: true });
    assert.equal(original.spec.template.spec.terminationGracePeriodSeconds, 30);
  }
});

test('更新策略拒绝错误的资源类型策略、无效数字及无法滚动的零值组合', () => {
  for (const [kind, patch] of [
    ['Deployment', { updateStrategy: { type: 'OnDelete' } }],
    ['StatefulSet', { updateStrategy: { type: 'Recreate' } }],
    ['DaemonSet', { updateStrategy: { type: 'Recreate' } }],
    [
      'Deployment',
      { updateStrategy: { type: 'RollingUpdate', maxUnavailable: '0', maxSurge: '0%' } },
    ],
    [
      'Deployment',
      { updateStrategy: { type: 'RollingUpdate', maxUnavailable: '-1', maxSurge: 1 } },
    ],
    [
      'Deployment',
      { updateStrategy: { type: 'RollingUpdate', maxUnavailable: '101%', maxSurge: 1 } },
    ],
    [
      'Deployment',
      { updateStrategy: { type: 'RollingUpdate', maxUnavailable: '2.5', maxSurge: 1 } },
    ],
    ['Deployment', { updateStrategy: { type: 'RollingUpdate', maxUnavailable: '', maxSurge: 1 } }],
    ['DaemonSet', { updateStrategy: { type: 'RollingUpdate', maxUnavailable: 0 } }],
    ['DaemonSet', { minReadySeconds: -1 }],
    ['DaemonSet', { minReadySeconds: 0.5 }],
    ['StatefulSet', { updateStrategy: { type: 'RollingUpdate', partition: -1 } }],
    ['StatefulSet', { updateStrategy: { type: 'RollingUpdate', partition: 0.5 } }],
    ['StatefulSet', { replicas: -1 }],
    ['Deployment', { replicas: 1.5 }],
    ['Deployment', { terminationGracePeriodSeconds: -1 }],
    ['StatefulSet', { terminationGracePeriodSeconds: 0.5 }],
  ] as const) {
    const original = settingsFixture(kind);
    const values = { ...parseDeploymentSettings(original), ...patch } as any;
    assert.throws(
      () => buildDeploymentSettingsResource(original, values),
      /WORKLOAD_SETTINGS_INVALID/,
      `${kind}: ${JSON.stringify(patch)}`,
    );
    assert.equal(original.metadata.resourceVersion, '42');
    assert.equal(original.spec.template.spec.terminationGracePeriodSeconds, 30);
  }
});

test('只改容器不重写缺省策略；支持显式零副本、零分区和 DS 的 maxSurge 滚动更新', () => {
  for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
    const original = settingsFixture(kind);
    const values = parseDeploymentSettings(original);
    const next = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(next, original);
  }
  const original = settingsFixture('DaemonSet');
  original.spec.updateStrategy = {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 1, maxSurge: 1 },
  };
  const values = parseDeploymentSettings(original);
  values.updateStrategy.maxUnavailable = '0';
  assert.deepEqual(
    buildDeploymentSettingsResource(original, values).spec.updateStrategy.rollingUpdate,
    { maxUnavailable: 0, maxSurge: 1 },
  );
  const sts = settingsFixture('StatefulSet');
  const stsValues = parseDeploymentSettings(sts);
  stsValues.replicas = 0;
  stsValues.updateStrategy.partition = 0;
  assert.equal(buildDeploymentSettingsResource(sts, stsValues).spec.replicas, 0);
});

for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
  test(`${kind} Pod 安全上下文回填、修改、清空并保留未知字段`, () => {
    const original = settingsFixture(kind);
    original.spec.template.spec.securityContext = {
      runAsNonRoot: true,
      runAsUser: 1000,
      runAsGroup: 2000,
      seLinuxOptions: { level: 's0:c1,c2', type: 'container_t' },
      seccompProfile: { type: 'RuntimeDefault' },
      fsGroup: 3000,
    };
    const values = parseDeploymentSettings(original);
    assert.deepEqual(values.podSecurityContext, {
      runAsNonRoot: true,
      runAsUser: 1000,
      runAsGroup: 2000,
      seLinuxOptions: { level: 's0:c1,c2', type: 'container_t' },
    });
    assert.deepEqual(buildDeploymentSettingsResource(original, values), original);
    values.podSecurityContext!.runAsUser = 1001;
    let submitted = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(submitted.spec.template.spec.securityContext, {
      runAsNonRoot: true,
      runAsUser: 1001,
      runAsGroup: 2000,
      seLinuxOptions: { level: 's0:c1,c2', type: 'container_t' },
      seccompProfile: { type: 'RuntimeDefault' },
      fsGroup: 3000,
    });
    values.podSecurityContext = undefined;
    submitted = buildDeploymentSettingsResource(original, values);
    assert.equal('securityContext' in submitted.spec.template.spec, false);
    assert.deepEqual(original.spec.template.spec.securityContext.seccompProfile, {
      type: 'RuntimeDefault',
    });
  });
}

test('容器安全上下文覆盖 V3 字段并在修改时保留未建模字段', () => {
  const original = settingsFixture('Deployment');
  original.spec.template.spec.containers[0].securityContext = {
    privileged: false,
    allowPrivilegeEscalation: false,
    readOnlyRootFilesystem: true,
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 2000,
    seLinuxOptions: { user: 'system_u', role: 'system_r', type: 'container_t', level: 's0' },
    capabilities: { add: ['NET_BIND_SERVICE'], drop: ['ALL'] },
    seccompProfile: { type: 'RuntimeDefault' },
  };
  const values = parseDeploymentSettings(original);
  assert.deepEqual(values.containers[0].securityContext, {
    privileged: false,
    allowPrivilegeEscalation: false,
    readOnlyRootFilesystem: true,
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 2000,
    seLinuxOptions: { user: 'system_u', role: 'system_r', type: 'container_t', level: 's0' },
    capabilities: { add: ['NET_BIND_SERVICE'], drop: ['ALL'] },
  });
  assert.deepEqual(buildDeploymentSettingsResource(original, values), original);
  values.containers[0].securityContext!.privileged = true;
  values.containers[0].securityContext!.capabilities!.add = ['SYS_TIME'];
  let submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.template.spec.containers[0].securityContext, {
    privileged: true,
    allowPrivilegeEscalation: false,
    readOnlyRootFilesystem: true,
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 2000,
    seLinuxOptions: { user: 'system_u', role: 'system_r', type: 'container_t', level: 's0' },
    capabilities: { add: ['SYS_TIME'], drop: ['ALL'] },
    seccompProfile: { type: 'RuntimeDefault' },
  });
  values.containers[0].securityContext = undefined;
  submitted = buildDeploymentSettingsResource(original, values);
  assert.equal('securityContext' in submitted.spec.template.spec.containers[0], false);
});

test('安全上下文拒绝非整数 UID/GID、非法布尔值和非法 capability', () => {
  for (const securityContext of [
    { runAsUser: 1.5 },
    { runAsGroup: Number.NaN },
    { privileged: 'yes' },
    { capabilities: { add: ['net_admin'] } },
    { capabilities: { drop: [''] } },
    { seLinuxOptions: { type: 1 } },
  ]) {
    assert.equal(
      validateContainers([
        { name: 'web', image: 'nginx', securityContext: securityContext as any },
      ]),
      'WORKLOAD_SECURITY_CONTEXT_INVALID',
    );
  }
  const original = settingsFixture('StatefulSet');
  const values = parseDeploymentSettings(original);
  values.podSecurityContext = { runAsUser: 1.5 } as any;
  assert.throws(
    () => buildDeploymentSettingsResource(original, values),
    /WORKLOAD_SECURITY_CONTEXT_INVALID/,
  );
});

test('创建 Deployment 写入 Pod、工作容器和初始化容器安全上下文', () => {
  const resource = buildDeployment({
    name: 'security-create',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    podSecurityContext: { runAsNonRoot: true, runAsUser: 1000 },
    containers: [
      {
        name: 'web',
        image: 'nginx',
        securityContext: {
          allowPrivilegeEscalation: false,
          readOnlyRootFilesystem: true,
          capabilities: { drop: ['ALL'] },
        },
      },
    ],
    initContainers: [
      {
        name: 'init',
        image: 'busybox',
        securityContext: { runAsUser: 1001, seLinuxOptions: { type: 'container_t' } },
      },
    ],
  });
  assert.deepEqual(resource.spec.template.spec.securityContext, {
    runAsNonRoot: true,
    runAsUser: 1000,
  });
  assert.deepEqual(resource.spec.template.spec.containers[0].securityContext, {
    allowPrivilegeEscalation: false,
    readOnlyRootFilesystem: true,
    capabilities: { drop: ['ALL'] },
  });
  assert.deepEqual(resource.spec.template.spec.initContainers[0].securityContext, {
    runAsUser: 1001,
    seLinuxOptions: { type: 'container_t' },
  });
});

test('StatefulSet 的 PVC 模板可作为容器挂载来源，仍拒绝未定义的卷名', () => {
  const containers = [
    { name: 'web', image: 'nginx', volumeMounts: [{ name: 'data', mountPath: '/data' }] },
  ];
  assert.equal(validateContainers(containers, [], [], ['data']), undefined);
  assert.equal(validateContainers(containers, [], [], []), 'WORKLOAD_VOLUME_MOUNT_INVALID');
  assert.equal(validateContainers(containers, [], [], ['other']), 'WORKLOAD_VOLUME_MOUNT_INVALID');
});

for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
  test(`${kind} Workload 顶层元数据支持回填、修改和清空且不改变 selector 与 Pod 模板`, () => {
    const original = settingsFixture(kind);
    original.metadata.labels = {
      app: 'native-settings',
      'example.com/editable': 'before',
    };
    original.metadata.annotations = {
      'kubesphere.io/creator': 'admin',
      'example.com/editable': 'before',
    };
    original.spec.selector = { matchLabels: { app: 'native-settings' } };
    original.spec.template.metadata.annotations = { 'example.com/pod': 'kept' };
    const before = cloneTestResource(original);
    const values = parseDeploymentSettings(original);

    assert.deepEqual(values.workloadLabels, original.metadata.labels);
    assert.deepEqual(values.workloadAnnotations, original.metadata.annotations);
    assert.deepEqual(buildDeploymentSettingsResource(original, values), before);

    values.workloadLabels = {
      ...values.workloadLabels,
      'example.com/editable': 'after',
      'example.com/new': '',
    };
    values.workloadAnnotations = {
      ...values.workloadAnnotations,
      'example.com/editable': 'after',
      'example.com/new': '',
    };
    let submitted = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(submitted.metadata.labels, {
      app: 'native-settings',
      'example.com/editable': 'after',
      'example.com/new': '',
    });
    assert.deepEqual(submitted.metadata.annotations, {
      'kubesphere.io/creator': 'admin',
      'example.com/editable': 'after',
      'example.com/new': '',
    });
    assert.deepEqual(submitted.spec.selector, original.spec.selector);
    assert.deepEqual(submitted.spec.template.metadata, original.spec.template.metadata);

    values.workloadLabels = {};
    values.workloadAnnotations = {};
    submitted = buildDeploymentSettingsResource(original, values);
    assert.equal('labels' in submitted.metadata, false);
    assert.equal('annotations' in submitted.metadata, false);
    assert.deepEqual(submitted.spec.selector, original.spec.selector);
    assert.deepEqual(submitted.spec.template.metadata, original.spec.template.metadata);
    assert.deepEqual(original, before);
  });

  test(`${kind} Pod 模板注解支持回填、修改和清空且不改变模板标签`, () => {
    const original = settingsFixture(kind);
    original.spec.template.metadata.annotations = {
      'example.com/editable': 'before',
      'kubesphere.io/restartedAt': '2026-10-23T00:00:00Z',
    };
    const before = cloneTestResource(original);
    const values = parseDeploymentSettings(original);

    assert.deepEqual(values.podAnnotations, original.spec.template.metadata.annotations);
    assert.deepEqual(buildDeploymentSettingsResource(original, values), before);

    values.podAnnotations = {
      ...values.podAnnotations,
      'example.com/editable': 'after',
      'example.com/new': '',
    };
    let submitted = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(submitted.spec.template.metadata.annotations, {
      'example.com/editable': 'after',
      'kubesphere.io/restartedAt': '2026-10-23T00:00:00Z',
      'example.com/new': '',
    });
    assert.deepEqual(submitted.spec.template.metadata.labels, { app: 'native-settings' });

    values.podAnnotations = {};
    submitted = buildDeploymentSettingsResource(original, values);
    assert.equal('annotations' in submitted.spec.template.metadata, false);
    assert.deepEqual(submitted.spec.template.metadata.labels, { app: 'native-settings' });
    assert.deepEqual(original, before);
  });
}

test('Pod 模板注解校验 Kubernetes qualified name 并允许空值', () => {
  assert.equal(
    validatePodAnnotations({
      'example.com/key': 'value',
      'UPPER_case.with-dots': '',
    }),
    true,
  );
  for (const annotations of [
    { '': 'value' },
    { '/key': 'value' },
    { 'Example.com/key': 'value' },
    { 'example..com/key': 'value' },
    { [`example.com/${'a'.repeat(64)}`]: 'value' },
    { 'example.com/key': 1 },
  ]) {
    assert.equal(validatePodAnnotations(annotations as any), false);
  }
});

test('已有 Workload 顶层元数据拒绝非法 label 和 annotation', () => {
  const original = settingsFixture('StatefulSet');
  const values = parseDeploymentSettings(original);

  values.workloadLabels = { 'invalid key': 'value' };
  assert.throws(() => buildDeploymentSettingsResource(original, values), /WORKLOAD_LABELS_INVALID/);

  values.workloadLabels = { 'example.com/key': 'value' };
  values.workloadAnnotations = { '/invalid': 'value' };
  assert.throws(
    () => buildDeploymentSettingsResource(original, values),
    /WORKLOAD_ANNOTATIONS_INVALID/,
  );
});

test('创建 Deployment 将 Pod 模板注解写入模板元数据', () => {
  const resource = buildDeployment({
    name: 'metadata-create',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    podAnnotations: {
      'example.com/owner': 'migration',
      'example.com/empty': '',
    },
    containers: [{ name: 'web', image: 'nginx' }],
  });
  assert.deepEqual(resource.spec.template.metadata, {
    labels: { app: 'metadata-create' },
    annotations: {
      'example.com/owner': 'migration',
      'example.com/empty': '',
    },
  });
  assert.throws(
    () =>
      buildDeployment({
        name: 'metadata-invalid',
        namespace: 'v4-migration-e2e',
        replicas: 1,
        podAnnotations: { '/invalid': 'value' },
        containers: [{ name: 'web', image: 'nginx' }],
      }),
    /WORKLOAD_ANNOTATIONS_INVALID/,
  );
});

for (const [kind, expectedMode] of [
  ['Deployment', 'decentralized'],
  ['StatefulSet', 'aggregation'],
] as const) {
  test(`${kind} Pod 调度模式支持回填、切换和显式清空`, () => {
    const original = settingsFixture(kind);
    const policy = expectedMode === 'decentralized' ? 'podAntiAffinity' : 'podAffinity';
    original.spec.template.spec.affinity = {
      [policy]: {
        preferredDuringSchedulingIgnoredDuringExecution: [
          {
            weight: 100,
            podAffinityTerm: {
              labelSelector: { matchLabels: { app: 'native-settings' } },
              topologyKey: 'kubernetes.io/hostname',
            },
          },
        ],
      },
    };
    const values = parseDeploymentSettings(original);
    assert.equal(values.podScheduling?.mode, expectedMode);
    assert.deepEqual(buildDeploymentSettingsResource(original, values), original);

    values.podScheduling = { mode: 'default' };
    let submitted = buildDeploymentSettingsResource(original, values);
    assert.equal('affinity' in submitted.spec.template.spec, false);

    values.podScheduling = { mode: expectedMode };
    submitted = buildDeploymentSettingsResource(original, values);
    assert.deepEqual(submitted.spec.template.spec.affinity, original.spec.template.spec.affinity);
  });
}

test('DaemonSet 不显示旧 V3 调度分区且编辑其他字段时完整保留 affinity', () => {
  const original = settingsFixture('DaemonSet');
  original.spec.template.spec.affinity = {
    nodeAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: {
        nodeSelectorTerms: [{ matchExpressions: [{ key: 'zone', operator: 'Exists' }] }],
      },
    },
  };
  const values = parseDeploymentSettings(original);
  assert.equal(values.podScheduling, undefined);
  values.containers[0].image = 'nginx:alpine';
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(submitted.spec.template.spec.affinity, original.spec.template.spec.affinity);
});

test('自定义 Pod 亲和与反亲和规则按 V3 结构回填和写入', () => {
  const original = settingsFixture('Deployment');
  original.spec.template.spec.affinity = {
    podAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: [
        {
          labelSelector: {
            matchExpressions: [{ key: 'app', operator: 'In', values: ['api'] }],
          },
          topologyKey: 'kubernetes.io/hostname',
        },
      ],
    },
    podAntiAffinity: {
      preferredDuringSchedulingIgnoredDuringExecution: [
        {
          weight: 100,
          podAffinityTerm: {
            labelSelector: {
              matchExpressions: [{ key: 'app', operator: 'In', values: ['worker'] }],
            },
            topologyKey: 'kubernetes.io/hostname',
          },
        },
      ],
    },
  };
  const values = parseDeploymentSettings(original);
  assert.deepEqual(values.podScheduling, {
    mode: 'custom',
    rules: [
      {
        policy: 'podAffinity',
        type: 'requiredDuringSchedulingIgnoredDuringExecution',
        target: 'api',
      },
      {
        policy: 'podAntiAffinity',
        type: 'preferredDuringSchedulingIgnoredDuringExecution',
        target: 'worker',
      },
    ],
  });
  values.podScheduling!.rules![1].target = 'jobs';
  const submitted = buildDeploymentSettingsResource(original, values);
  assert.deepEqual(
    submitted.spec.template.spec.affinity.podAntiAffinity
      .preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector
      .matchExpressions[0].values,
    ['jobs'],
  );
});

test('Pod 调度和节点选择拒绝不完整规则及非法 Kubernetes label', () => {
  assert.equal(validatePodScheduling({ mode: 'default' }), true);
  assert.equal(validatePodScheduling({ mode: 'custom', rules: [] }), false);
  assert.equal(
    validatePodScheduling({
      mode: 'custom',
      rules: [
        {
          policy: 'podAffinity',
          type: 'requiredDuringSchedulingIgnoredDuringExecution',
          target: 'api',
        },
        {
          policy: 'podAffinity',
          type: 'preferredDuringSchedulingIgnoredDuringExecution',
          target: 'worker',
        },
      ],
    }),
    false,
  );
  assert.equal(
    validatePodScheduling({
      mode: 'custom',
      rules: [
        {
          policy: 'podAffinity',
          type: 'requiredDuringSchedulingIgnoredDuringExecution',
          target: 'API service',
        },
      ],
    }),
    false,
  );
  assert.equal(validateNodeSelector({ 'node-role.kubernetes.io/worker': '' }), true);
  assert.equal(validateNodeSelector({ '/worker': 'yes' }), false);
  assert.equal(validateNodeSelector({ zone: 'a'.repeat(64) }), false);
});

test('创建 Deployment 写入亲和模式与节点选择器', () => {
  const resource = buildDeployment({
    name: 'scheduling-create',
    namespace: 'v4-migration-e2e',
    replicas: 1,
    podScheduling: { mode: 'decentralized' },
    nodeSelector: { 'node-role.kubernetes.io/worker': '' },
    containers: [{ name: 'web', image: 'nginx' }],
  });
  assert.deepEqual(resource.spec.template.spec.nodeSelector, {
    'node-role.kubernetes.io/worker': '',
  });
  assert.deepEqual(
    resource.spec.template.spec.affinity.podAntiAffinity
      .preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchLabels,
    { app: 'scheduling-create' },
  );
  assert.throws(
    () =>
      buildDeployment({
        name: 'scheduling-invalid',
        namespace: 'v4-migration-e2e',
        replicas: 1,
        podScheduling: { mode: 'custom', rules: [] },
        containers: [{ name: 'web', image: 'nginx' }],
      }),
    /WORKLOAD_SCHEDULING_INVALID/,
  );
});
