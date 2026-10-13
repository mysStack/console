import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('resource host reuses the consolev3 app and exposes activation lifecycle marks', () => {
  assert.match(source, /name="consolev3"/);
  assert.match(source, /alive=\{keepAlive\}/);
  assert.match(source, /activeScopeKey/);
  assert.match(source, /shouldKeepConsoleV3Alive/);
  assert.match(source, /DEFAULT_CONSOLE_V3_LIST_CACHE_TTL = 30_000/);
  assert.match(source, /cacheTtlMs/);
  assert.match(source, /markConsoleV3Phase/);
  assert.match(source, /activated/);
  assert.match(source, /render/);
  assert.match(source, /deactivated/);
  assert.match(source, /!url\.includes\('\/consolev3\/'\)/);
});
