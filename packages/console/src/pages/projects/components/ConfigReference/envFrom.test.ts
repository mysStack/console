import assert from 'node:assert/strict';
import test from 'node:test';

import { findDuplicateReferences, parseEnvFrom, serializeEnvFrom } from './envFrom';

test('parses valid ConfigMap and Secret references without reading data', () => {
  assert.deepEqual(
    parseEnvFrom([
      { configMapRef: { name: 'app-config' }, prefix: 'APP_' },
      { secretRef: { name: 'db-credentials' } },
      { secretRef: { name: 'ignored' }, data: { password: 'must-not-be-read' } },
    ]),
    [
      { kind: 'configMap', name: 'app-config', prefix: 'APP_' },
      { kind: 'secret', name: 'db-credentials' },
      { kind: 'secret', name: 'ignored' },
    ],
  );
});

test('ignores empty, malformed and ambiguous references', () => {
  assert.deepEqual(
    parseEnvFrom([
      undefined,
      { configMapRef: { name: '' } },
      { secretRef: {} },
      { configMapRef: { name: 'config' }, secretRef: { name: 'secret' } },
      { configMapRef: { name: '  trimmed  ' }, prefix: 42 },
    ]),
    [{ kind: 'configMap', name: 'trimmed' }],
  );
});

test('serializes valid rows and omits incomplete rows', () => {
  assert.deepEqual(
    serializeEnvFrom([
      { kind: 'configMap', name: 'app-config', prefix: 'APP_' },
      { kind: 'secret', name: 'db-credentials' },
      { kind: 'secret', name: '   ' },
    ]),
    [
      { configMapRef: { name: 'app-config' }, prefix: 'APP_' },
      { secretRef: { name: 'db-credentials' } },
    ],
  );
});

test('reports duplicate references by type and name regardless of prefix', () => {
  assert.deepEqual(
    findDuplicateReferences([
      { kind: 'secret', name: 'db', prefix: '' },
      { kind: 'secret', name: 'db', prefix: '' },
      { kind: 'secret', name: 'db', prefix: 'APP_' },
      { kind: 'configMap', name: 'db', prefix: '' },
    ]),
    [1, 2],
  );
});
