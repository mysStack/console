import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDuplicateEnvFromIndexes,
  getUnavailableEnvFromIndexes,
  getEnvFromReferenceViewState,
  getEnvFromReferenceReloadState,
  toNameOptions,
} from './envFromReference';
import {
  addEnvFromReference,
  changeEnvFromType,
  removeEnvFromReference,
  updateEnvFromReference,
} from './envFromReference';

test('turns resource responses into name-only options and never exposes secret data', () => {
  assert.deepEqual(
    toNameOptions([
      { metadata: { name: 'db-credentials' }, data: {} },
      { name: 'app-config', data: {} },
      { metadata: { name: '' }, data: {} },
    ]),
    [
      { label: 'db-credentials', value: 'db-credentials' },
      { label: 'app-config', value: 'app-config' },
    ],
  );
  assert.equal(
    JSON.stringify(toNameOptions([{ metadata: { name: 'db-credentials' }, data: {} }])),
    '[{"label":"db-credentials","value":"db-credentials"}]',
  );
});

test('updates the pure reference row model for add, edit, type change, and delete', () => {
  const added = addEnvFromReference([]);
  assert.deepEqual(added, [{ type: 'configMap', name: '', prefix: '' }]);
  const selected = updateEnvFromReference(added, 0, { name: 'app-config' });
  assert.deepEqual(changeEnvFromType(selected, 0, 'secret'), [
    { type: 'secret', name: '', prefix: '' },
  ]);
  assert.deepEqual(updateEnvFromReference(selected, 0, { prefix: 'APP_' })[0].prefix, 'APP_');
  assert.deepEqual(removeEnvFromReference(selected, 0), []);
});

test('derives loading, error, empty and ready reference view states', () => {
  assert.equal(getEnvFromReferenceViewState(true, false, []).kind, 'loading');
  assert.equal(getEnvFromReferenceViewState(false, true, []).kind, 'error');
  assert.equal(getEnvFromReferenceViewState(false, false, []).kind, 'empty');
  assert.equal(
    getEnvFromReferenceViewState(false, false, [
      { type: 'secret', name: 'db-credentials', prefix: '' },
    ]).kind,
    'ready',
  );
});

test('finds duplicate reference row indexes', () => {
  assert.deepEqual(
    getDuplicateEnvFromIndexes([
      { type: 'secret', name: 'db-credentials', prefix: '' },
      { type: 'secret', name: 'db-credentials', prefix: 'APP_' },
    ]),
    [1],
  );
});

test('finds references that are no longer available in the current project', () => {
  assert.deepEqual(
    getUnavailableEnvFromIndexes(
      [
        { type: 'configMap', name: 'removed-config', prefix: '' },
        { type: 'secret', name: 'db-credentials', prefix: '' },
      ],
      [{ label: 'db-credentials', value: 'db-credentials' }],
      [],
    ),
    [0, 1],
  );
});

test('resets options and errors on reload', () => {
  assert.deepEqual(getEnvFromReferenceReloadState(), {
    configMaps: [],
    secrets: [],
    loading: true,
    error: false,
  });
});
