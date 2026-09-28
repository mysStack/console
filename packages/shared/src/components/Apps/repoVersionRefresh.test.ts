import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRefreshVersionsForRepositorySync } from './repoVersionRefresh';

test('refreshes versions only when the completed repository owns the application', () => {
  assert.equal(shouldRefreshVersionsForRepositorySync('redis-oci', ['redis-oci', 'traefik']), true);
  assert.equal(shouldRefreshVersionsForRepositorySync('redis-oci', ['traefik']), false);
  assert.equal(shouldRefreshVersionsForRepositorySync(undefined, ['redis-oci']), false);
});
