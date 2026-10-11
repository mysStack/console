import assert from 'node:assert/strict';
import test from 'node:test';

import { createConfigReferenceDraftSession, mergeConfigReferenceDrafts } from './draft';

test('a newly named container cannot inherit the first container refs even without opening references', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  session.beginContainer('worker');
  session.confirmContainer();
  session.confirmGroup();
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers.push({
    ...structuredClone(template.spec.template.spec.containers[0]),
    name: 'worker',
  });
  const submitted = mergeConfigReferenceDrafts(template, session.getSubmittedChanges());
  assert.equal('envFrom' in submitted.spec.template.spec.containers[2], false);
  assert.deepEqual(submitted.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
});

const nativeSubmission = {
  kind: 'Deployment',
  metadata: { name: 'example', annotations: { owner: 'qa' } },
  spec: {
    replicas: 2,
    strategy: { type: 'RollingUpdate', rollingUpdate: { maxUnavailable: 0 } },
    template: {
      spec: {
        containers: [
          {
            name: 'ams-server',
            image: 'app:v2',
            env: [{ name: 'DB', value: '111' }],
            envFrom: [{ configMapRef: { name: 'main-config' } }],
            ports: [{ containerPort: 8093 }],
            readinessProbe: { tcpSocket: { port: 8093 } },
          },
          {
            name: 'nginx',
            image: 'nginx:v2',
            envFrom: [{ secretRef: { name: 'nginx-config' } }],
            resources: { limits: { memory: '128Mi' } },
          },
        ],
        volumes: [{ name: 'data', emptyDir: {} }],
        tolerations: [{ key: 'qa', operator: 'Exists' }],
      },
    },
  },
};

test('outer native submission cannot restore a reference explicitly deleted in its draft', () => {
  const submitted = mergeConfigReferenceDrafts(nativeSubmission, [
    { containerName: 'nginx', references: [], reloaderEnabled: false },
  ]);
  assert.equal('envFrom' in submitted.spec.template.spec.containers[1], false);
  assert.deepEqual(
    submitted.spec.template.spec.containers[0],
    nativeSubmission.spec.template.spec.containers[0],
  );
  assert.deepEqual(submitted.spec.template.spec.containers[1].resources, {
    limits: { memory: '128Mi' },
  });
  assert.equal(submitted.spec.template.spec.containers[1].image, 'nginx:v2');
  assert.equal(submitted.spec.replicas, 2);
  assert.deepEqual(submitted.spec.strategy, {
    type: 'RollingUpdate',
    rollingUpdate: { maxUnavailable: 0 },
  });
  assert.deepEqual(submitted.spec.template.spec.tolerations, [{ key: 'qa', operator: 'Exists' }]);
  assert.deepEqual(submitted.spec.template.spec.volumes, [{ name: 'data', emptyDir: {} }]);
});

test('reference draft merges into a newly added native container without borrowing main references', () => {
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers.push({ name: 'new-nginx', image: 'nginx:v3' } as any);
  const submitted = mergeConfigReferenceDrafts(template, [
    {
      containerName: 'new-nginx',
      references: [{ kind: 'secret', name: 'new-nginx-secret', prefix: 'NEW_' }],
      reloaderEnabled: false,
    },
  ]);
  assert.deepEqual(submitted.spec.template.spec.containers[2].envFrom, [
    { secretRef: { name: 'new-nginx-secret' }, prefix: 'NEW_' },
  ]);
  assert.deepEqual(submitted.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
  assert.deepEqual(submitted.spec.template.spec.containers[1].envFrom, [
    { secretRef: { name: 'nginx-config' } },
  ]);
});

test('final native container order rather than the original API index determines the merge target', () => {
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers.reverse();
  const submitted = mergeConfigReferenceDrafts(template, [
    { containerName: 'nginx', references: [], reloaderEnabled: true },
  ]);
  assert.equal('envFrom' in submitted.spec.template.spec.containers[0], false);
  assert.deepEqual(submitted.spec.template.spec.containers[1].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
  assert.deepEqual(submitted.metadata.annotations, {
    owner: 'qa',
    'reloader.stakater.com/auto': 'true',
  });
});

test('merging neither mutates the native draft nor recreates a container deleted in native settings', () => {
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers.pop();
  const before = structuredClone(template);
  const submitted = mergeConfigReferenceDrafts(template, [
    { containerName: 'nginx', references: [], reloaderEnabled: true },
  ]);
  assert.deepEqual(template, before);
  assert.deepEqual(submitted, before);
  assert.notEqual(submitted, template);
});

test('multiple container drafts preserve a simultaneous manual variable edit and the source objects', () => {
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers[0].env![0].value = '222';
  const before = structuredClone(template);
  const changes = [
    {
      containerName: 'ams-server',
      references: [{ kind: 'configMap' as const, name: 'next-config' }],
      reloaderEnabled: true,
    },
    { containerName: 'nginx', references: [], reloaderEnabled: false },
  ];
  const changesBefore = structuredClone(changes);
  const submitted = mergeConfigReferenceDrafts(template, changes);
  assert.deepEqual(submitted.spec.template.spec.containers[0].env, [{ name: 'DB', value: '222' }]);
  assert.deepEqual(submitted.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'next-config' } },
  ]);
  assert.equal('envFrom' in submitted.spec.template.spec.containers[1], false);
  assert.deepEqual(submitted.metadata.annotations, { owner: 'qa' });
  assert.deepEqual(template, before);
  assert.deepEqual(changes, changesBefore);
});

test('the existing file-mount planner participates in the same immutable native submission', () => {
  const submitted = mergeConfigReferenceDrafts(nativeSubmission, [
    {
      containerName: 'nginx',
      references: [],
      reloaderEnabled: false,
      fileMounts: [
        { kind: 'configMap', name: 'nginx-files', mountPath: '/etc/nginx', readOnly: true },
      ],
    },
  ]);
  assert.deepEqual(submitted.spec.template.spec.volumes, [
    { name: 'data', emptyDir: {} },
    { name: 'nginx-files', configMap: { name: 'nginx-files' } },
  ]);
  assert.deepEqual(submitted.spec.template.spec.containers[1].volumeMounts, [
    { name: 'nginx-files', mountPath: '/etc/nginx', readOnly: true },
  ]);
  assert.deepEqual(nativeSubmission.spec.template.spec.volumes, [{ name: 'data', emptyDir: {} }]);
});

test('a session stages only its named container and seeds new containers with empty references', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  session.beginContainer('nginx');
  session.stage({ containerName: 'nginx', references: [], reloaderEnabled: false });
  const source = session.getSource('new-nginx');
  assert.equal(source.spec.template.spec.containers.length, 3);
  assert.equal('envFrom' in source.spec.template.spec.containers[2], false);
  assert.deepEqual(source.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
  assert.equal('envFrom' in source.spec.template.spec.containers[1], false);
  assert.deepEqual(nativeSubmission.spec.template.spec.containers[1].envFrom, [
    { secretRef: { name: 'nginx-config' } },
  ]);
  assert.equal(session.getChanges().length, 1);
});

test('native container cancellation restores the previous accepted draft without touching another container', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  session.beginContainer('nginx');
  session.stage({ containerName: 'nginx', references: [], reloaderEnabled: false });
  session.confirmContainer();
  session.beginContainer('ams-server');
  session.stage({ containerName: 'ams-server', references: [], reloaderEnabled: true });
  session.cancelContainer();
  assert.deepEqual(session.getChanges(), [
    { containerName: 'nginx', references: [], reloaderEnabled: false },
  ]);
  const source = session.getSource('ams-server');
  assert.deepEqual(source.spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
  assert.equal('envFrom' in source.spec.template.spec.containers[1], false);
});

test('reopening and cancelling a container keeps its accepted references and does not retain row mutations', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  const change = {
    containerName: 'nginx',
    references: [{ kind: 'configMap' as const, name: 'next-config' }],
    reloaderEnabled: false,
  };
  session.beginContainer('nginx');
  session.stage(change);
  session.confirmContainer();
  change.references[0].name = 'mutated-outside';
  session.beginContainer('nginx');
  session.stage({ containerName: 'nginx', references: [], reloaderEnabled: false });
  session.cancelContainer();
  assert.equal(session.getChanges().length, 1);
  assert.deepEqual(session.getChanges()[0].references, [
    { kind: 'configMap', name: 'next-config' },
  ]);
  const copy = session.getChanges();
  copy[0].references[0].name = 'mutated-copy';
  assert.equal(session.getChanges()[0].references[0].name, 'next-config');
});

test('only native containers-step confirmation promotes staged references into the final submission', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  session.beginContainer('nginx');
  session.stage({ containerName: 'nginx', references: [], reloaderEnabled: false });
  session.confirmContainer();
  assert.deepEqual(session.getSubmittedChanges(), []);
  session.confirmGroup();
  assert.deepEqual(session.getSubmittedChanges(), [
    { containerName: 'nginx', references: [], reloaderEnabled: false },
  ]);
  session.beginContainer('ams-server');
  session.stage({ containerName: 'ams-server', references: [], reloaderEnabled: false });
  session.confirmContainer();
  session.cancelGroup();
  assert.deepEqual(session.getChanges(), [
    { containerName: 'nginx', references: [], reloaderEnabled: false },
  ]);
  assert.deepEqual(session.getSource('ams-server').spec.template.spec.containers[0].envFrom, [
    { configMapRef: { name: 'main-config' } },
  ]);
});

test('a new-container empty-reference default does not undo a workload-wide Reloader choice', () => {
  const session = createConfigReferenceDraftSession(nativeSubmission);
  session.beginContainer('ams-server');
  session.stage({ containerName: 'ams-server', references: [], reloaderEnabled: true });
  session.confirmContainer();
  session.beginContainer('worker');
  session.confirmContainer();
  session.confirmGroup();
  const template = structuredClone(nativeSubmission);
  template.spec.template.spec.containers.push({
    ...structuredClone(template.spec.template.spec.containers[0]),
    name: 'worker',
  });
  const submitted = mergeConfigReferenceDrafts(template, session.getSubmittedChanges());
  assert.equal(submitted.metadata.annotations['reloader.stakater.com/auto'], 'true');
  assert.equal('envFrom' in submitted.spec.template.spec.containers[2], false);
});
