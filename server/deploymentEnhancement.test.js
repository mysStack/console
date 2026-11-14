const assert = require('node:assert/strict');
const test = require('node:test');
const {
  resourceContext,
  isDeploymentRead,
  referenceSnapshot,
  applySavePatch,
} = require('./public/deploymentEnhancement');
const context = { workspace: 'ws', cluster: 'host', namespace: 'ns', name: 'app.v2' };
const resource = {
  metadata: { uid: 'uid-1', resourceVersion: '41', annotations: {} },
  spec: {
    template: {
      spec: {
        containers: [
          { name: 'main', image: 'fixture', envFrom: [] },
          { name: 'sidecar', envFrom: [] },
        ],
        volumes: [],
      },
    },
  },
};

test('native resource context includes the exact selected workspace, cluster, namespace and name', () => {
  assert.deepEqual(
    resourceContext('/consolev3/ws/clusters/host/projects/ns/deployments/app.v2/env'),
    { ...context, list: '/consolev3/ws/clusters/host/projects/ns/deployments' },
  );
  assert.equal(resourceContext('/consolev3/ws/clusters/host/projects/ns/pods/app'), null);
  assert.equal(resourceContext('/consolev3/ws/clusters/host/projects/ns/deployments'), null);
});

test('refresh reads cannot be satisfied by another cluster, namespace, or workload', () => {
  assert.equal(
    isDeploymentRead(context, '/clusters/host/apis/apps/v1/namespaces/ns/deployments/app.v2'),
    'detail',
  );
  assert.equal(
    isDeploymentRead(
      context,
      '/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/ns/deployments',
    ),
    'list',
  );
  for (const value of [
    '/clusters/other/apis/apps/v1/namespaces/ns/deployments/app.v2',
    '/clusters/host/apis/apps/v1/namespaces/ns-other/deployments/app.v2',
    '/clusters/host/apis/apps/v1/namespaces/ns/deployments/app.v20',
  ])
    assert.equal(isDeploymentRead(context, value), null);
});

test('expected saved references are derived without changing the loaded resource', () => {
  const expected = applySavePatch(resource, [
    { op: 'test', path: '/metadata/resourceVersion', value: '41' },
    {
      op: 'replace',
      path: '/spec/template/spec/containers/0/envFrom',
      value: [{ configMapRef: { name: 'fixture' }, prefix: 'APP_' }],
    },
  ]);
  assert.deepEqual(resource.spec.template.spec.containers[0].envFrom, []);
  assert.deepEqual(expected.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'fixture' }, prefix: 'APP_' },
  ]);
  assert.notEqual(referenceSnapshot(expected), referenceSnapshot(resource));
  const reordered = structuredClone(expected);
  reordered.metadata.resourceVersion = '43';
  reordered.spec.template.spec.containers.reverse();
  assert.equal(referenceSnapshot(expected), referenceSnapshot(reordered));
});

test('invalid guards and prototype pointers cannot alter expected save state', () => {
  assert.throws(
    () =>
      applySavePatch(resource, [{ op: 'test', path: '/metadata/resourceVersion', value: '40' }]),
    /version/i,
  );
  assert.throws(
    () => applySavePatch(resource, [{ op: 'add', path: '/__proto__/polluted', value: true }]),
    /pointer/i,
  );
  assert.equal({}.polluted, undefined);
});
