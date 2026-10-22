import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Deployment 副本数使用 Kubed 支持的整数输入组件', () => {
  assert.match(source, /InputNumber/);
  assert.match(source, /<InputNumber min=\{0\} precision=\{0\} \/>/);
  assert.doesNotMatch(source, /NumberInput/);
});

test('工作容器与初始化容器变化时重新执行跨容器校验', () => {
  assert.match(source, /name="containers"[\s\S]*dependencies=\{\['initContainers'\]\}/);
  assert.match(source, /name="initContainers"[\s\S]*dependencies=\{\['containers'\]\}/);
});
