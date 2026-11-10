import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { isWorkloadEnvDetailReady } from './ready';

test('直达环境变量页时 undefined 或空 detail 不能当已就绪', () => {
  assert.equal(isWorkloadEnvDetailReady(undefined), false);
  assert.equal(isWorkloadEnvDetailReady(null), false);
  assert.equal(isWorkloadEnvDetailReady({}), false);
  assert.equal(isWorkloadEnvDetailReady({ namespace: 'dev-wes' }), true);
});

test('环境变量页读取 namespace 前必须先确认 detail 已就绪', () => {
  const src = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
  assert.match(src, /isWorkloadEnvDetailReady\(detail\)/);
  assert.match(src, /namespace: detail\.namespace/);
});
