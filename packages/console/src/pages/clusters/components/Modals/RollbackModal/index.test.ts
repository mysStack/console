import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = readFileSync(path.join(__dirname, 'index.tsx'), 'utf8');

test('回滚目标版本是必填项并保留明确的空值提示', () => {
  const targetRevisionField = source.match(
    /<FormItem[\s\S]*?name=\{\['revision'\]\}[\s\S]*?<\/FormItem>/,
  )?.[0];

  assert.ok(targetRevisionField, '应渲染目标版本字段');
  assert.match(targetRevisionField, /rules=\{\[\{\s*required:\s*true,/);
  assert.match(targetRevisionField, /message:\s*t\('TARGET_REVISION_EMPTY_DESC'\)/);
});
