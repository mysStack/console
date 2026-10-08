import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONFIGMAP_METADATA_ACCEPT,
  SECRET_METADATA_ACCEPT,
  toMetadataNameList,
  toSecretNameList,
} from './secretNameList';

test('uses Kubernetes PartialObjectMetadataList content negotiation for Secret names', () => {
  assert.equal(
    SECRET_METADATA_ACCEPT,
    'application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1',
  );
  assert.equal(CONFIGMAP_METADATA_ACCEPT, SECRET_METADATA_ACCEPT);
});

test('maps only Secret metadata names', () => {
  assert.deepEqual(
    toSecretNameList([{ metadata: { name: 'db-credentials' } }, { metadata: { name: '' } }]),
    ['db-credentials'],
  );
});

test('maps only ConfigMap metadata names', () => {
  assert.deepEqual(
    toMetadataNameList([{ metadata: { name: 'app-config' } }, { data: { password: 'ignored' } }]),
    ['app-config'],
  );
});
