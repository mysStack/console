import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('通用 YAML 编辑路径使用严格解析并保留错误处理', () => {
  assert.match(source, /yaml\.loadStrict\(data\)/);
  assert.match(source, /try \{[\s\S]*await onOk\(newYaml, initialValues\);[\s\S]*catch/);
});

test('服务端 YAML 保存失败时编辑弹窗保留可见内联错误', () => {
  assert.match(source, /Alert/);
  assert.match(source, /YamlEditorContent/);
  assert.match(source, /showError/);
});
