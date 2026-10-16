import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Secret list uses the native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /secretStore/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react/);
});

test('Secret list source does not decode or render secret values', () => {
  assert.doesNotMatch(source, /safeAtob|decode|base64|value\s*:/);
});
