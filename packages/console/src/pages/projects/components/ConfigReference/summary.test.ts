import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getConfigReferenceSummaryPrefix,
  getConfigReferenceSummaryRows,
  getContainerEnvironmentVariableCount,
} from './summary';

test('counts individually configured env separately from all envFrom references', () => {
  const source = {
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'main',
              env: [{ name: 'DB', value: '111' }],
              envFrom: [{ configMapRef: { name: 'config' } }, { secretRef: { name: 'secret' } }],
            },
            { name: 'sidecar', envFrom: [{ configMapRef: { name: 'sidecar-config' } }] },
            {
              name: 'env-only',
              env: [{ name: 'TOKEN', valueFrom: { secretKeyRef: { name: 's', key: 'token' } } }],
            },
          ],
        },
      },
    },
  };
  assert.equal(getContainerEnvironmentVariableCount(source, 'main'), 1);
  assert.equal(getContainerEnvironmentVariableCount(source, 'sidecar'), 0);
  assert.equal(getContainerEnvironmentVariableCount(source, 'env-only'), 1);
  assert.equal(getContainerEnvironmentVariableCount(source, 'absent'), 0);
});

test('prefers the original workload env and never borrows the first container count', () => {
  assert.equal(
    getContainerEnvironmentVariableCount(
      {
        containers: [{ name: 'main', env: [{ name: 'STALE' }, { name: 'STALE2' }] }],
        _originData: {
          spec: { template: { spec: { containers: [{ name: 'main', env: [{ name: 'DB' }] }] } } },
        },
      },
      'main',
    ),
    1,
  );
  assert.equal(getContainerEnvironmentVariableCount({}, 'main'), 0);
});

test('does not reserve a visible prefix column when no prefix is configured', () => {
  assert.equal(getConfigReferenceSummaryPrefix({ kind: 'secret', name: 'wes-secret' }), undefined);
  assert.equal(
    getConfigReferenceSummaryPrefix({ kind: 'configMap', name: 'wes-app', prefix: 'APP_' }),
    'APP_',
  );
});

test('builds display rows without reading ConfigMap or Secret data', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [
        { configMapRef: { name: 'wes-app' }, prefix: 'APP_' },
        { secretRef: { name: 'wes-secret' } },
      ],
    }),
    [
      { kind: 'configMap', name: 'wes-app', prefix: 'APP_', label: 'FROM_CONFIGMAP' },
      { kind: 'secret', name: 'wes-secret', label: 'FROM_SECRET' },
    ],
  );
});

test('omits malformed references from the display', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [{ configMapRef: { name: '' } }, { secretRef: { name: 'valid' } }],
    }),
    [{ kind: 'secret', name: 'valid', label: 'FROM_SECRET' }],
  );
});
