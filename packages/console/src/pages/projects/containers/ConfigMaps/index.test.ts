import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap list uses a dedicated alive consolev3 app instance', () => {
  assert.match(source, /name="consolev3-configmaps"/);
  assert.match(source, /\balive\s*=\s*\{true\}/);
});
