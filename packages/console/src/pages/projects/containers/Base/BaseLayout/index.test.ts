import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project BaseLayout schedules V3 deployments warmup via host global', () => {
  assert.match(source, /useLocation/);
  assert.match(source, /__KS_SCHEDULE_CONSOLE_V3_PROJECT_WARMUP__/);
  assert.match(source, /pathname/);
});
