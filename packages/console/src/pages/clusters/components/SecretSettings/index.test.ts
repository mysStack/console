import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Secret data editor writes submitted key values back to the parent form', () => {
  assert.match(source, /form\.setFieldsValue/);
  assert.match(source, /form\.resetFields\(\['data'\]\)/);
});
