import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { resolveProjectCluster, getScopedProjectPath } from './projectScope';

test('selects a ready cluster synchronously and retains a valid explicit selection', () => {
  const clusters = [
    { name: 'pending', isReady: false },
    { name: 'host', isReady: true },
    { name: 'member', isReady: true },
  ];
  assert.equal(resolveProjectCluster('', clusters, false), 'host');
  assert.equal(resolveProjectCluster('member', clusters, false), 'member');
  assert.equal(resolveProjectCluster('pending', clusters, false), 'host');
});

test('never resolves an unavailable cluster during the initial fetch or with no granted ready cluster', () => {
  assert.equal(resolveProjectCluster('', undefined, true), '');
  assert.equal(resolveProjectCluster('old', [{ name: 'old', isReady: true }], true), '');
  assert.equal(resolveProjectCluster('old', [{ name: 'pending', isReady: false }], false), '');
});

test('project paths require actual workspace, cluster and namespace', () => {
  assert.equal(
    getScopedProjectPath('dev-workspace', 'host', 'dev-wms'),
    '/dev-workspace/clusters/host/projects/dev-wms',
  );
  assert.equal(getScopedProjectPath('dev-workspace', '', 'dev-wms'), '');
  assert.equal(getScopedProjectPath(undefined, 'host', 'dev-wms'), '');
  assert.equal(getScopedProjectPath('dev-workspace', 'host', ''), '');
});

test('project table is not rendered until cluster scope is resolved', () => {
  const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
  assert.match(source, /if \(!cluster\) \{/);
  assert.match(source, /const cluster = resolveProjectCluster\(/);
  assert.match(source, /getScopedProjectPath\(record.workspace, cluster, record.name\)/);
  assert.match(source, /enabled: !!cluster && !!hasMonitoring && list.length > 0/);
});
