import assert from 'node:assert/strict';
import test from 'node:test';

import { getClusterHostRoute } from './routeSync';

test('converts a V3 cluster detail route into the host Console route', () => {
  assert.equal(getClusterHostRoute('/consolev3/clusters/host/overview'), '/clusters/host/overview');
});

test('converts the cluster list route and rejects similarly prefixed routes', () => {
  assert.equal(getClusterHostRoute('/consolev3/clusters'), '/clusters');
  assert.equal(getClusterHostRoute('/consolev3/clusters-invalid'), null);
});

test('ignores V3 routes that do not belong to cluster navigation', () => {
  assert.equal(getClusterHostRoute('/consolev3/dashboard'), null);
});
