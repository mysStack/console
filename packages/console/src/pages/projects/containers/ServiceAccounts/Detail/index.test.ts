import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project ServiceAccount detail uses native DetailPage', () => {
  assert.match(source, /DetailPage/);
  assert.match(source, /serviceAccountStore/);
  assert.doesNotMatch(source, /WujieReact|wujie-react|wujieUrlPrefix|consolev3/);
});
