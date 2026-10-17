import assert from 'node:assert/strict';
import test from 'node:test';

import { getDataDescription, getEditableDataValue, getSubmittedDataValue } from './dataListUtils';

test('masks Secret data descriptions in the edit settings list', () => {
  assert.equal(getDataDescription('encoded-secret-value', 'secrets'), '******');
});

test('keeps ConfigMap data descriptions readable', () => {
  assert.equal(getDataDescription('config-value', 'configmaps'), 'config-value');
});

test('does not preload an existing Secret value into the edit form', () => {
  assert.equal(getEditableDataValue('encoded-secret-value', 'secrets'), '');
});

test('keeps an existing Secret value when the masked edit form is unchanged', () => {
  assert.equal(
    getSubmittedDataValue('encoded-secret-value', '', 'secrets'),
    'encoded-secret-value',
  );
});
