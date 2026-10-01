import assert from 'node:assert/strict';
import test from 'node:test';

import { SECRET_METADATA_ACCEPT, toSecretNameList } from './secretNameList';

test('uses Kubernetes PartialObjectMetadataList content negotiation for Secret names', () => {
  assert.equal(
    SECRET_METADATA_ACCEPT,
    'application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1',
  );
});

test('maps only Secret metadata names', () => {
  assert.deepEqual(
    toSecretNameList([{ metadata: { name: 'db-credentials' } }, { metadata: { name: '' } }]),
    ['db-credentials'],
  );
});
