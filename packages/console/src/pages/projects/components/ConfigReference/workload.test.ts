import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildConfigReferencePatch,
  getContainerEnvFrom,
  getContainerNames,
  resolveConfigReferenceContainer,
} from './workload';

const detail = {
  metadata: {
    annotations: { 'example.com/owner': 'team-a' },
  },
  spec: {
    template: {
      spec: {
        containers: [
          { name: 'api', image: 'api:v1', envFrom: [{ secretRef: { name: 'api-secret' } }] },
          { name: 'sidecar', image: 'proxy:v1', envFrom: [] },
        ],
      },
    },
  },
};

test('reads container names and envFrom from the original workload shape', () => {
  assert.deepEqual(getContainerNames({ _originData: detail } as any), ['api', 'sidecar']);
  assert.deepEqual(getContainerEnvFrom({ _originData: detail } as any, 'api'), [
    { secretRef: { name: 'api-secret' } },
  ]);
});

test('does not borrow the first container when editing a new unsaved container', () => {
  assert.equal(resolveConfigReferenceContainer(detail as any, 'nginx'), '');
});

test('requires an explicit target instead of guessing in a multi-container editor', () => {
  assert.equal(resolveConfigReferenceContainer(detail as any), '');
  assert.equal(resolveConfigReferenceContainer(detail as any, 'sidecar'), 'sidecar');
});

test('does not guess a single saved container when the editor target cannot be identified', () => {
  const source = {
    spec: { template: { spec: { containers: [{ name: 'api' }] } } },
  } as any;
  assert.equal(resolveConfigReferenceContainer(source), '');
  assert.equal(resolveConfigReferenceContainer(source, 'api'), 'api');
  assert.equal(resolveConfigReferenceContainer(source, 'nginx'), '');
});

test('deleting sidecar references emits no patch for the main container', () => {
  const source = structuredClone(detail);
  source.spec.template.spec.containers[1].envFrom = [{ secretRef: { name: 'sidecar-secret' } }];
  assert.deepEqual(buildConfigReferencePatch(source as any, 'sidecar', [], false), [
    { op: 'remove', path: '/spec/template/spec/containers/1/envFrom' },
  ]);
  assert.deepEqual(source.spec.template.spec.containers[0].envFrom, [
    { secretRef: { name: 'api-secret' } },
  ]);
});

test('patches only the selected container and Reloader annotation', () => {
  assert.deepEqual(
    buildConfigReferencePatch(
      { _originData: detail } as any,
      'api',
      [{ kind: 'configMap', name: 'app-config', prefix: 'APP_' }],
      true,
    ),
    [
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/envFrom',
        value: [{ configMapRef: { name: 'app-config' }, prefix: 'APP_' }],
      },
      {
        op: 'add',
        path: '/metadata/annotations/reloader.stakater.com~1auto',
        value: 'true',
      },
    ],
  );
});

test('replaces an empty envFrom list on the selected container', () => {
  const patch = buildConfigReferencePatch(
    { _originData: detail } as any,
    'sidecar',
    [{ kind: 'secret', name: 'sidecar-secret', prefix: '' }],
    false,
  );

  assert.deepEqual(patch, [
    {
      op: 'replace',
      path: '/spec/template/spec/containers/1/envFrom',
      value: [{ secretRef: { name: 'sidecar-secret' } }],
    },
  ]);
});

test('carries file mounts into the same patch, and stays unchanged without them', () => {
  const source = {
    spec: { template: { spec: { volumes: [], containers: [{ name: 'main' }] } } },
  } as any;

  const without = buildConfigReferencePatch(source, 'main', [], false);
  assert.ok(
    without.every(op => !String(op.path).includes('/volumes')),
    'an envFrom-only save must not touch volumes',
  );

  const withMounts = buildConfigReferencePatch(source, 'main', [], false, [
    { kind: 'configMap', name: 'app-config', mountPath: '/etc/app', readOnly: true },
  ]);
  assert.deepEqual(
    withMounts.map(op => `${op.op} ${op.path}`),
    ['add /spec/template/spec/volumes', 'add /spec/template/spec/containers/0/volumeMounts'],
  );
  assert.deepEqual(withMounts[0].value, [
    { name: 'app-config', configMap: { name: 'app-config' } },
  ]);
  assert.deepEqual(withMounts[1].value, [
    { name: 'app-config', mountPath: '/etc/app', readOnly: true },
  ]);
});
