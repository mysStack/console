import assert from 'node:assert/strict';
import test from 'node:test';

import { getGlobalMessage } from './request';

test('formats a network failure without an HTTP response', () => {
  assert.deepEqual(getGlobalMessage({ message: 'net::ERR_FAILED' }), {
    status: 0,
    reason: 'Network Error',
    message: 'net::ERR_FAILED',
  });
});

test('formats an HTTP error response', () => {
  const response = {
    status: 403,
    data: { reason: 'Forbidden', message: 'access denied' },
  } as any;

  assert.deepEqual(getGlobalMessage({ response }), {
    status: 403,
    reason: 'Forbidden',
    message: 'access denied',
    response,
  });
});
