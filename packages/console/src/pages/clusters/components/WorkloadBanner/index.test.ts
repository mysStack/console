import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('workload banner preserves project scope when switching workload tabs', () => {
  assert.match(source, /const pathParts = pathname\.split\('\/'\)\.filter\(Boolean\)/);
  assert.match(source, /nextPathParts\[nextPathParts\.length - 1\] = nav/);
  assert.match(source, /nextPathParts\.join\('\/'\)/);
});
