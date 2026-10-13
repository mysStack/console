import assert from 'node:assert';
import test from 'node:test';
import {
  clearResourceListRevisions,
  getResourceListCacheVersion,
  ResourceListInvalidation,
  resourceListInvalidation,
} from './resourceListInvalidation';

test('resource invalidation revisions are scoped by resource type', () => {
  const invalidation = new ResourceListInvalidation();
  assert.equal(invalidation.get('configmaps'), 0);
  invalidation.invalidate('configmaps');
  assert.equal(invalidation.get('configmaps'), 1);
  assert.equal(invalidation.get('secrets'), 0);
});

test('resource list revisions can be cleared on logout', () => {
  resourceListInvalidation.invalidate('configmaps');
  clearResourceListRevisions();
  assert.equal(resourceListInvalidation.get('configmaps'), 0);
  assert.equal(getResourceListCacheVersion('configmaps'), '1:0');
});
