import assert from 'node:assert/strict';
import test from 'node:test';

import { mapServiceAccountSecrets } from './serviceAccountsMapper';

test('ServiceAccount references keep only Secret names', () => {
  assert.deepEqual(
    mapServiceAccountSecrets([{ name: 'builder-token', token: 'sensitive-value' }]),
    [{ name: 'builder-token' }],
  );
});

test('ServiceAccount references ignore malformed or missing Secret names', () => {
  assert.deepEqual(mapServiceAccountSecrets([null, {}, { name: '' }, { name: 'token' }]), [
    { name: 'token' },
  ]);
  assert.deepEqual(mapServiceAccountSecrets(undefined), []);
});
