import assert from 'node:assert';
import test from 'node:test';

import { metadataDetail } from './metadata';

test('metadataDetail passes Kubernetes metadata to the shared metadata cards', () => {
  const metadata = {
    name: 'wes-app',
    labels: { app: 'wes' },
    annotations: { 'example.com/owner': 'platform' },
  };

  assert.deepEqual(metadataDetail({ metadata }), metadata);
});

test('metadataDetail returns an empty object when the API response has no metadata', () => {
  assert.deepEqual(metadataDetail(), {});
  assert.deepEqual(metadataDetail({}), {});
});
