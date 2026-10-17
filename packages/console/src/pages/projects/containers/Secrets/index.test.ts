import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');
const clusterSource = readFileSync(
  __dirname.replace('/projects/containers/Secrets', '/clusters/containers/Configuration/Secrets') +
    '/index.tsx',
  'utf8',
);

test('Secret list uses the native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /secretStore/);
  assert.match(source, /ConfigResourceCreateModal/);
  assert.match(source, /usePostMutation/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react/);
});

test('Secret list source does not decode or render secret values', () => {
  assert.doesNotMatch(source, /safeAtob|decode|base64|value\s*:/);
});

test('project Secret list is scoped to the route namespace', () => {
  assert.match(source, /hasNamespaceSelector=\{!namespace\}/);
  assert.match(source, /getTableUrl/);
  assert.match(source, /secretStore\.getResourceUrl\(\{ cluster, namespace \}\)/);
  assert.match(source, /namespace=\{namespace\}/);
});

test('Secret list keeps enough width for resource names', () => {
  for (const listSource of [source, clusterSource]) {
    assert.match(listSource, /field: 'type',[\s\S]{0,180}width: '15%'/);
    assert.match(listSource, /field: 'data',[\s\S]{0,180}width: '12%'/);
    assert.match(listSource, /field: 'createTime',[\s\S]{0,180}width: 180/);
  }
});
