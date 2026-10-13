import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap list uses the shared persistent consolev3 resource host', () => {
  assert.match(source, /ConsoleV3ResourceList/);
  assert.match(source, /url=\{`\$\{wujieUrlPrefix\}\/configmaps`\}/);
  assert.doesNotMatch(source, /WujieReact/);
});
