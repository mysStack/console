import assert from 'node:assert';
import test from 'node:test';
import {
  clearResourceListRevisions,
  getResourceListCacheVersion,
  ResourceListInvalidation,
  resourceListInvalidation,
  RuleSnapshots,
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

test('rules fetched for the first time do not invalidate cached lists', () => {
  const snapshots = new RuleSnapshots();

  assert.equal(snapshots.record('clusterroles|host', { pods: ['view'] }), false);
});

test('refetching identical rules does not invalidate cached lists', () => {
  const snapshots = new RuleSnapshots();
  snapshots.record('clusterroles|host', { pods: ['view', 'edit'], nodes: ['view'] });

  assert.equal(
    snapshots.record('clusterroles|host', { nodes: ['view'], pods: ['edit', 'view'] }),
    false,
  );
});

test('a real permission change invalidates cached lists', () => {
  const snapshots = new RuleSnapshots();
  snapshots.record('roles|host|ws|proj', { pods: ['view'] });

  assert.equal(snapshots.record('roles|host|ws|proj', { pods: ['view', 'edit'] }), true);
});

test('rule snapshots are tracked per scope', () => {
  const snapshots = new RuleSnapshots();
  snapshots.record('roles|host|ws|a', { pods: ['view'] });

  assert.equal(snapshots.record('roles|host|ws|b', { pods: ['edit'] }), false);
});
