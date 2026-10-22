import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap list uses the native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /configMapStore/);
  assert.match(source, /ConfigResourceCreateModal/);
  assert.match(source, /usePostMutation/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react/);
});

test('project ConfigMap list is scoped to the route namespace', () => {
  assert.match(source, /hasNamespaceSelector=\{!namespace\}/);
  assert.match(source, /getTableUrl/);
  assert.match(source, /configMapStore\.getResourceUrl\(\{ cluster, namespace \}\)/);
  assert.match(source, /namespace=\{namespace\}/);
});
