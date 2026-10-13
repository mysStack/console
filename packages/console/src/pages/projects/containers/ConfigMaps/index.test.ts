import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap list keeps the consolev3 app alive between detail navigation', () => {
  assert.match(source, /<WujieReact[\s\S]*\balive\s*=\s*\{true\}/);
});
