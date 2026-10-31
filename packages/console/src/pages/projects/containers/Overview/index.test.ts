import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project overview keeps the shared consolev3 sandbox alive', () => {
  // Leaving overview without `alive` clears the ShadowRoot. The next list
  // activate then hits an empty husk, waits for verify, and pays a full cold
  // boot (~8s). Keep the sandbox so overview → 工作负载 is an activate+sync.
  assert.match(source, /ConsoleV3AliveEmbed/);
});
