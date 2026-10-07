import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEnvFromName,
  previewReference,
  previewReferences,
  PREVIEW_SECRET_KEYS,
} from './preview';
import type { ResourceKeys } from './preview';
import type { EnvFromReference } from './types';

const keys = (data: string[], binaryData: string[] = []): ResourceKeys => ({ data, binaryData });

const lookup =
  (map: Record<string, ResourceKeys>) =>
  (reference: EnvFromReference): ResourceKeys =>
    map[`${reference.kind}:${reference.name}`] || { data: [], binaryData: [] };

test('joins prefix and key, and leaves the name untouched without a prefix', () => {
  assert.equal(buildEnvFromName('A_', 'DB_HOST'), 'A_DB_HOST');
  assert.equal(buildEnvFromName('', 'DB_HOST'), 'DB_HOST');
});

test('lists data keys as environment variables in resource order', () => {
  const result = previewReference({ kind: 'configMap', name: 'cm' }, keys(['B', 'A', 'C']));
  assert.deepEqual(result.names, ['B', 'A', 'C']);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.ignoredBinary, []);
});

test('reports keys kubelet would silently drop', () => {
  const result = previewReference(
    { kind: 'configMap', name: 'cm' },
    keys(['ok_name', 'app.invalid', 'db-host', '1starts_with_digit']),
  );
  assert.deepEqual(result.names, ['ok_name']);
  assert.deepEqual(result.skipped, ['app.invalid', 'db-host', '1starts_with_digit']);
});

test('a prefix can rescue a key that would otherwise be dropped', () => {
  const bare = previewReference({ kind: 'configMap', name: 'cm' }, keys(['1starts_with_digit']));
  assert.deepEqual(bare.skipped, ['1starts_with_digit']);

  const prefixed = previewReference(
    { kind: 'configMap', name: 'cm', prefix: 'A_' },
    keys(['1starts_with_digit']),
  );
  assert.deepEqual(prefixed.names, ['A_1starts_with_digit']);
  assert.deepEqual(prefixed.skipped, []);
});

test('binaryData keys are reported separately and never become variables', () => {
  const result = previewReference(
    { kind: 'configMap', name: 'cm' },
    keys(['CONFIG'], ['logo.png']),
  );
  assert.deepEqual(result.names, ['CONFIG']);
  assert.deepEqual(result.ignoredBinary, ['logo.png']);
  // entries keep resource order, binary keys last
  assert.deepEqual(
    result.entries.map(entry => [entry.key, entry.status]),
    [
      ['CONFIG', 'ok'],
      ['logo.png', 'binary'],
    ],
  );
});

test('skipped keys appear in entries with their resulting name', () => {
  const result = previewReference(
    { kind: 'configMap', name: 'cm', prefix: 'P_' },
    keys(['fine', 'bad.key']),
  );
  assert.deepEqual(result.entries, [
    { key: 'fine', name: 'P_fine', status: 'ok' },
    { key: 'bad.key', name: 'P_bad.key', status: 'skipped' },
  ]);
});

test('rows without a resource are unresolved and contribute nothing', () => {
  const result = previewReferences(
    [
      { kind: 'configMap', name: '' },
      { kind: 'secret', name: 's' },
    ],
    lookup({ 'secret:s': keys(['TOKEN']) }),
  );
  assert.equal(result[0].resolved, false);
  assert.deepEqual(result[0].names, []);
  assert.equal(result[1].resolved, true);
  assert.deepEqual(result[1].names, ['TOKEN']);
});

test('flags a name produced by more than one reference row', () => {
  const result = previewReferences(
    [
      { kind: 'configMap', name: 'a' },
      { kind: 'configMap', name: 'b' },
      { kind: 'secret', name: 'c' },
    ],
    lookup({
      'configMap:a': keys(['SHARED', 'ONLY_A']),
      'configMap:b': keys(['SHARED']),
      'secret:c': keys(['OTHER']),
    }),
  );
  assert.deepEqual(result[0].duplicated, ['SHARED']);
  assert.deepEqual(result[1].duplicated, ['SHARED']);
  assert.deepEqual(result[2].duplicated, []);
});

test('a dropped key never raises a duplicate or a conflict', () => {
  const result = previewReferences(
    [
      { kind: 'configMap', name: 'a' },
      { kind: 'configMap', name: 'b' },
    ],
    lookup({
      'configMap:a': keys(['app.invalid']),
      'configMap:b': keys(['app.invalid']),
    }),
    { manualEnvNames: ['app.invalid'] },
  );
  assert.deepEqual(result[0].duplicated, []);
  assert.deepEqual(result[0].shadowedByEnv, []);
});

test('flags names a manual environment variable already occupies', () => {
  const result = previewReferences(
    [{ kind: 'configMap', name: 'a' }],
    lookup({ 'configMap:a': keys(['AMS_URL', 'AUTH_SERVER_URL', 'FRESH']) }),
    { manualEnvNames: ['AMS_URL', 'AUTH_SERVER_URL', 'DB_PASSWORD'] },
  );
  assert.deepEqual(result[0].shadowedByEnv, ['AMS_URL', 'AUTH_SERVER_URL']);
});

test('ignores blank and non-string manual environment names', () => {
  const result = previewReferences(
    [{ kind: 'configMap', name: 'a' }],
    lookup({ 'configMap:a': keys(['AMS_URL']) }),
    { manualEnvNames: ['  ', '', '  AMS_URL  ' as string] },
  );
  assert.deepEqual(result[0].shadowedByEnv, ['AMS_URL']);
});

test('Secret key preview is enabled so Secret keys take part in the checks', () => {
  assert.equal(PREVIEW_SECRET_KEYS, true);
});
