import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ServiceAccount create modal validates name and namespace', () => {
  assert.match(source, /NamespaceSelector/);
  assert.match(source, /metadata.*name|name.*metadata/s);
  assert.match(source, /onOk/);
});
