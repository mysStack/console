import assert from 'node:assert/strict';
import test from 'node:test';

import { getCredentialListState } from './credentialState';

test('marks an empty successful response as empty', () => {
  assert.equal(getCredentialListState(false, false, 0), 'empty');
});

test('keeps loading and request errors distinct from an empty response', () => {
  assert.equal(getCredentialListState(true, false, 0), 'loading');
  assert.equal(getCredentialListState(false, true, 0), 'error');
  assert.equal(getCredentialListState(false, false, 1), 'ready');
});
