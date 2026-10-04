import assert from 'node:assert/strict';
import test from 'node:test';

import { buildConfigReferencePatch, getContainerEnvFrom, getContainerNames } from './workload';

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
