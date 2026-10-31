import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConsoleV3AliveEmbed keeps the shared consolev3 sandbox alive', () => {
  assert.match(source, /name="consolev3"/);
  assert.match(source, /\balive\b/);
  assert.match(source, /watchConsoleV3Sandbox/);
  assert.match(source, /scheduleConsoleV3ListRouteSync/);
});

test('ConsoleV3AliveEmbed runs afterUnmount on deactivated and React unmount', () => {
  // alive embeds never fire wujie's afterUnmount; cleanup must use deactivated.
  assert.match(source, /deactivated=\{appWindow => \{/);
  assert.match(source, /afterUnmount\?\.\(appWindow\)/);
  assert.match(source, /afterUnmountRef\.current\?\.\(\)/);
});
