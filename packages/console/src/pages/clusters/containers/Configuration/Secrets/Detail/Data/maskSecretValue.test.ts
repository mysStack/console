import assert from 'node:assert';
import test from 'node:test';

import { MASKED_SECRET_VALUE, getSecretDisplayValue } from './maskSecretValue';

test('masks secret values until the user explicitly reveals them', () => {
  const value = 'sensitive-test-value';

  assert.equal(getSecretDisplayValue(value, false), MASKED_SECRET_VALUE);
  assert.notEqual(getSecretDisplayValue(value, false), value);
  assert.equal(getSecretDisplayValue(value, true), value);
});

test('does not expose nullish secret values while masked', () => {
  assert.equal(getSecretDisplayValue(undefined, false), MASKED_SECRET_VALUE);
  assert.equal(getSecretDisplayValue(null, false), MASKED_SECRET_VALUE);
  assert.equal(getSecretDisplayValue(undefined, true), '');
  assert.equal(getSecretDisplayValue(null, true), '');
});
