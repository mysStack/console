import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findDuplicateEnvFrom,
  parseEnvFrom,
  removeIncompleteEnvFrom,
  serializeEnvFrom,
} from './envFrom';

test('serializes ConfigMap references with a prefix', () => {
  assert.deepEqual(serializeEnvFrom([{ type: 'configMap', name: 'app-config', prefix: 'APP_' }]), [
    { configMapRef: { name: 'app-config' }, prefix: 'APP_' },
  ]);
});

test('serializes Secret references without an empty prefix', () => {
  assert.deepEqual(serializeEnvFrom([{ type: 'secret', name: 'app-secret', prefix: '' }]), [
    { secretRef: { name: 'app-secret' } },
  ]);
});

test('parses Kubernetes EnvFromSource references', () => {
  assert.deepEqual(
    parseEnvFrom([
      { configMapRef: { name: 'app-config' }, prefix: 'APP_' },
      { secretRef: { name: 'app-secret' } },
    ]),
    [
      { type: 'configMap', name: 'app-config', prefix: 'APP_' },
      { type: 'secret', name: 'app-secret', prefix: '' },
    ],
  );
});

test('finds duplicate references by type and name', () => {
  assert.deepEqual(
    findDuplicateEnvFrom([
      { type: 'configMap', name: 'app-config', prefix: '' },
      { type: 'configMap', name: 'app-config', prefix: 'OTHER_' },
      { type: 'secret', name: 'app-config', prefix: '' },
    ]),
    [{ index: 1, name: 'app-config', type: 'configMap' }],
  );
});

test('removes rows without a reference name', () => {
  assert.deepEqual(
    removeIncompleteEnvFrom([
      { type: 'configMap', name: '', prefix: '' },
      { type: 'secret', name: 'app-secret', prefix: '' },
    ]),
    [{ type: 'secret', name: 'app-secret', prefix: '' }],
  );
});
