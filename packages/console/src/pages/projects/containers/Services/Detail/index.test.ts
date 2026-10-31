import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Service detail reuses the persistent consolev3 instance', () => {
  assert.match(source, /ConsoleV3AliveEmbed/);
});
