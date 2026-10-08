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

/**
 * The prefix is part of the identity. `kind:name` alone used to be treated as the
 * duplicate key, which made a legal and useful configuration unsaveable.
 */
test('reports duplicates only when type, name and prefix all match', () => {
  assert.deepEqual(
    findDuplicateReferences([
      { kind: 'secret', name: 'db', prefix: '' },
      { kind: 'secret', name: 'db', prefix: '' },
      { kind: 'secret', name: 'db', prefix: 'APP_' },
      { kind: 'configMap', name: 'db', prefix: '' },
    ]),
    [1],
  );
});

test('allows the same resource twice under different prefixes', () => {
  // envFrom renders prefix + key, so A_/B_ on one resource yields disjoint names.
  // Importing a shared resource under two prefixes is how collisions are avoided,
  // and it must therefore not be reported as a duplicate.
  assert.deepEqual(
    findDuplicateReferences([
      { kind: 'configMap', name: 'shared', prefix: 'A_' },
      { kind: 'configMap', name: 'shared', prefix: 'B_' },
    ]),
    [],
  );
});
