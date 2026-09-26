import assert from 'node:assert/strict';
import test from 'node:test';

import { getRepoDetailUrl, getRepoEventsUrl } from './repoUrl';

test('builds a repository event URL for the selected workspace and repository', () => {
  assert.equal(
    getRepoEventsUrl('system-workspace', 'redis-oci'),
    'kapis/application.kubesphere.io/v2/workspaces/system-workspace/repos/redis-oci/events',
  );
});

test('builds a repository detail URL for the selected workspace and repository', () => {
  assert.equal(
    getRepoDetailUrl('system-workspace', 'redis-oci'),
    'kapis/application.kubesphere.io/v2/workspaces/system-workspace/repos/redis-oci',
  );
});
