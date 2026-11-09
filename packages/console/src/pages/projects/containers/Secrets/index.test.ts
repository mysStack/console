import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Secret list uses host-native ListPage instead of consolev3 embed', () => {
  assert.doesNotMatch(source, /ConsoleV3ResourceList/);
  assert.match(source, /secretStore/);
  assert.match(source, /ListPage/);
});
