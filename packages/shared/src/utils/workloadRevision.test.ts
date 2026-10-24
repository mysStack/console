import assert from 'node:assert/strict';
import test from 'node:test';

test('builds one stable revision lookup key per workload resource version', async () => {
  const { getWorkloadIdentityKey, getWorkloadRevisionLookupKey } = await import(
    './workloadRevision'
  );
  const detail = {
    cluster: 'host',
    namespace: 'v4-migration-e2e',
    name: 'sample',
    uid: 'uid-1',
    resourceVersion: '10',
  };

  assert.equal(
    getWorkloadRevisionLookupKey('deployments', detail),
    getWorkloadRevisionLookupKey('deployments', { ...detail }),
  );
  assert.equal(
    getWorkloadRevisionLookupKey('deployments', { ...detail, resourceVersion: '11' }) ===
      getWorkloadRevisionLookupKey('deployments', detail),
    false,
  );
  assert.equal(getWorkloadRevisionLookupKey('deployments', {}), '');
  assert.equal(getWorkloadRevisionLookupKey('deployments', undefined), '');
  assert.equal(
    getWorkloadIdentityKey('deployments', detail),
    getWorkloadRevisionLookupKey('deployments', detail),
  );
});
