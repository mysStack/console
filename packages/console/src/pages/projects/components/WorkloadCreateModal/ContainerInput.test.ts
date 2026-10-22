import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'ContainerInput.tsx'), 'utf8');

test('容器基础字段纵向排列并占满表单宽度', () => {
  assert.match(source, /const ContainerField = styled\.label/);
  assert.match(source, /style=\{\{ width: '100%', maxWidth: 'none' \}\}/);
  assert.match(source, /style=\{\{ width: '100%' \}\}/);
});

test('容器端口名称、端口号和协议使用固定的同一行布局', () => {
  assert.match(source, /style=\{\{ flex: '1 1 0', minWidth: 0 \}\}/);
  assert.match(source, /style=\{\{ width: 120, flex: '0 0 120px' \}\}/);
});
