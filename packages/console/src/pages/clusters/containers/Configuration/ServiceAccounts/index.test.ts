import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ServiceAccount list uses native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /serviceAccountStore/);
  assert.match(source, /ServiceAccountCreateModal/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|WujieReact|wujie-react/);
});

test('project-scoped ServiceAccount list filters by the route namespace', () => {
  assert.match(source, /getTableUrl/);
  assert.match(source, /namespace/);
});
