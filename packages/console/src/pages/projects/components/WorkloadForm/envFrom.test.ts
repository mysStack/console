import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findDuplicateEnvFrom,
  parseEnvFrom,
  removeIncompleteEnvFrom,
  serializeEnvFrom,
} from './envFrom';
import type { EnvFromSource } from './types';

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

test('skips malformed and mixed Kubernetes EnvFromSource references', () => {
  assert.deepEqual(
    parseEnvFrom([
      {
        configMapRef: { name: 'app-config' },
        secretRef: { name: 'also-secret' },
      } as unknown as EnvFromSource,
      { configMapRef: { name: '' } },
      { secretRef: {} },
    ]),
    [],
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

test('ignores incomplete rows when finding duplicates and preserves original indexes', () => {
  assert.deepEqual(
    findDuplicateEnvFrom([
      { type: 'configMap', name: '', prefix: '' },
      { type: 'configMap', name: 'app-config', prefix: '' },
      { type: 'configMap', name: '', prefix: '' },
      { type: 'configMap', name: 'app-config', prefix: 'OTHER_' },
    ]),
    [{ index: 3, name: 'app-config', type: 'configMap' }],
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
