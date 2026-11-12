import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'detail.tsx'), 'utf8');

test('project ServiceAccount detail route uses the lowercase resource path', () => {
  assert.match(source, /\$\{PATH\}\/serviceaccounts\/:name/);
  assert.doesNotMatch(source, /\$\{PATH\}\/serviceAccounts\/:name/);
});
