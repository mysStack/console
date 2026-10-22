import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeployment } from './deployment';

test('buildDeployment creates a namespace-scoped apps/v1 deployment', () => {
  const deployment = buildDeployment({
    name: 'native-web',
    namespace: 'v4-migration-e2e',
    aliasName: 'Native Web',
    description: 'Deployment created by the native V4 form',
    replicas: 2,
    containerName: 'web',
    image: 'nginx:1.27-alpine',
    imagePullPolicy: 'IfNotPresent',
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
    containerName: '  web  ',
    image: '  nginx:alpine  ',
    imagePullPolicy: 'Always',
  });

  assert.equal(deployment.metadata.name, 'native-web');
  assert.equal(deployment.metadata.namespace, 'v4-migration-e2e');
  assert.deepEqual(deployment.metadata.annotations, {});
  assert.equal(deployment.spec.replicas, 0);
  assert.equal(deployment.spec.template.spec.containers[0].name, 'web');
  assert.equal(deployment.spec.template.spec.containers[0].image, 'nginx:alpine');
});
