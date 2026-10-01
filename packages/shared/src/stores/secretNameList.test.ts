import assert from 'node:assert/strict';
import test from 'node:test';

import { SECRET_METADATA_ACCEPT, toSecretNameList } from './secretNameList';

test('uses Kubernetes PartialObjectMetadata content negotiation for Secret names', () => {
  assert.equal(
    SECRET_METADATA_ACCEPT,
    'application/json;as=PartialObjectMetadata;g=meta.k8s.io;v=v1',
  );
});

test('maps only Secret metadata names', () => {
  assert.deepEqual(
    toSecretNameList([{ metadata: { name: 'db-credentials' } }, { metadata: { name: '' } }]),
    ['db-credentials'],
  );
});
