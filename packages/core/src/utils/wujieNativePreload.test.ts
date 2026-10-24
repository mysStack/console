import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(__dirname, 'wujie.ts'), 'utf8');

test('the shared Wujie initializer does not preload legacy V3 applications', () => {
  assert.doesNotMatch(source, /preloadApp\(/);
  assert.match(source, /setupApp\(/);
  assert.match(source, /name: 'consolev3'/);
  assert.match(source, /name: 'consoleV3Actions'/);
});
