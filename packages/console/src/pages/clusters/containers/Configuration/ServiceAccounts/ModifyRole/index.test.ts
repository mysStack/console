import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ServiceAccount role options are cached per cluster and namespace', () => {
  assert.match(source, /\['roles',\s*detail\?\.cluster,\s*detail\?\.namespace\]/);
});
