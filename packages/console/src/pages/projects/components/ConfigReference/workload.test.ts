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

test('preserves unrelated workload annotations and all containers in the merge patch', () => {
  assert.deepEqual(
    buildConfigReferencePatch(
      { _originData: detail } as any,
      'api',
      [{ kind: 'configMap', name: 'app-config', prefix: 'APP_' }],
      true,
    ),
    {
      metadata: {
        annotations: {
          'example.com/owner': 'team-a',
          'reloader.stakater.com/auto': 'true',
        },
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'api',
                image: 'api:v1',
                envFrom: [{ configMapRef: { name: 'app-config' }, prefix: 'APP_' }],
              },
              { name: 'sidecar', image: 'proxy:v1', envFrom: [] },
            ],
          },
        },
      },
    },
  );
});
