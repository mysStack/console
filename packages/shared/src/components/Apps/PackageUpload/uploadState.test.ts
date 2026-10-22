import assert from 'node:assert/strict';
import test from 'node:test';

import { getUploadValidationFailure } from './uploadState';

test('validation failures leave the package upload in a retryable error state', () => {
  assert.deepEqual(getUploadValidationFailure(), {
    status: 'error',
    error: 'UPLOAD_AGAIN_TIP',
  });
});
