import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap list uses the shared consolev3 app without stale alive caching', () => {
  assert.match(source, /name="consolev3"/);
  assert.doesNotMatch(source, /alive\s*=/);
});
