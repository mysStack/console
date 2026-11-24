import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('useV3action marks the overlay as the actions app and flushes after mount', () => {
  assert.match(source, /props=\{\{ actions: true, name: 'consoleV3Actions' \}\}/);
  assert.match(source, /afterMount=\{appWindow =>/);
  assert.match(source, /bus\.\$emit\('triggerAction'/);
  assert.match(source, /pendingRef/);
  assert.doesNotMatch(source, /\{\.\.\.lifecycles\}/);
});
