import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('packages/shared/src/components/Apps/RepoManage/index.tsx', 'utf8');

test('uses query-owned polling while repository synchronization is pending', () => {
  assert.match(source, /refreshInterval=\{pendingRepoSyncNames\.length > 0 \? 3000 : false\}/);
});
