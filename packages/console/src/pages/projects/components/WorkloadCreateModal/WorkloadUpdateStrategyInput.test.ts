import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
function loadInput() {
  // 只替换依赖浏览器的控件，实际组件的字段分支和 onChange 保持真实。
  const file = path.join(__dirname, 'WorkloadUpdateStrategyInput.tsx');
  assert.ok(require('node:fs').existsSync(file), '需要原生的、按资源区分的更新策略输入组件');
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} as any };
  runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    t: (key: string) => key,
    require: (name: string) =>
      name === '@kubed/components'
        ? { Input: 'input', InputNumber: 'input-number', Select: 'select' }
        : requireDependency(name),
  });
  return loaded.exports.default;
}
function fields(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  const props = node.props as any;
  return [node, ...React.Children.toArray(props.children).flatMap(fields)];
}
const inputByLabel = (tree: any, label: string) =>
  fields(tree).find(node => node.props['aria-label'] === label);

test('Deployment 策略切换和数量输入传递草稿，保留其他未编辑字段', () => {
  const Input = loadInput();
  const value = { type: 'RollingUpdate', maxUnavailable: '25%', maxSurge: '25%' };
  let changed: any;
  const tree = Input({ kind: 'Deployment', value, onChange: (next: any) => (changed = next) });
  inputByLabel(tree, 'UPDATE_STRATEGY').props.onChange('Recreate');
  assert.equal(changed.type, 'Recreate');
  assert.equal(changed.maxSurge, '25%');
  inputByLabel(tree, 'MAX_EXTRA_PODS').props.onChange({ target: { value: '2' } });
  assert.equal(changed.maxSurge, '2');
  assert.equal(changed.maxUnavailable, '25%');
  assert.equal(value.maxSurge, '25%');
  assert.ok(fields(tree).find(node => node.props['data-test'] === 'workload-update-strategy-card'));
  assert.ok(
    fields(tree).find(node => node.props['data-test'] === 'workload-update-strategy-settings'),
  );
  const recreate = Input({ kind: 'Deployment', value: { ...value, type: 'Recreate' } });
  assert.equal(inputByLabel(recreate, 'MAX_EXTRA_PODS'), undefined);
});

test('滚动更新字段按 V3 结构渲染：折叠区块、标签在上、必填星号与字段说明', () => {
  const Input = loadInput();
  const tree = Input({
    kind: 'Deployment',
    value: { type: 'RollingUpdate', maxUnavailable: '25%', maxSurge: '25%' },
  });
  const nodes = fields(tree);
  const settings = nodes.find(
    node => node.props['data-test'] === 'workload-update-strategy-settings',
  );
  assert.equal(settings.type, 'details');
  assert.equal(settings.props.open, undefined);
  const toggle = nodes.find(node => node.props['data-test'] === 'workload-update-strategy-toggle');
  assert.equal(toggle.type, 'summary');
  const grid = nodes.find(node => node.props['data-test'] === 'workload-update-strategy-fields');
  assert.equal(nodes.indexOf(grid) > nodes.indexOf(toggle), true);
  assert.equal(React.Children.toArray(settings.props.children).length, 2);
  assert.match(grid.props.style.gridTemplateColumns, /1fr/);

  const fieldConfigs = nodes.filter(node => typeof node.type === 'function' && node.props.htmlFor);
  assert.deepEqual(
    fieldConfigs.map(node => node.props.label),
    ['MAX_UNAVAILABLE_PODS', 'MAX_EXTRA_PODS'],
  );
  assert.deepEqual(
    fieldConfigs.map(node => node.props.description),
    ['MAX_UNAVAILABLE_PODS_DESC', 'MAX_EXTRA_PODS_DESC'],
  );
  for (const config of fieldConfigs) {
    const rendered = config.type(config.props);
    const label = React.Children.toArray(rendered.props.children)[0];
    assert.equal(label.type, 'label');
    assert.equal(label.props.htmlFor, config.props.htmlFor);
    const [text, required] = React.Children.toArray(label.props.children);
    assert.equal(text, config.props.label);
    assert.equal(required.props.children, '*');
    const description = React.Children.toArray(rendered.props.children)[2];
    assert.equal(description.type, 'p');
    assert.equal(description.props.children, config.props.description);
  }
});

test('StatefulSet 只提供 partition 和 OnDelete，不混入 Deployment 滚动字段', () => {
  const Input = loadInput();
  let changed: any;
  const tree = Input({
    kind: 'StatefulSet',
    value: { type: 'RollingUpdate', partition: 1 },
    onChange: (next: any) => (changed = next),
  });
  inputByLabel(tree, 'PARTITION_ORDINAL').props.onChange(0);
  assert.equal(changed.partition, 0);
  inputByLabel(tree, 'PARTITION_ORDINAL').props.onChange('2');
  assert.equal(changed.partition, 2);
  inputByLabel(tree, 'PARTITION_ORDINAL').props.onChange('');
  assert.equal(changed.partition, undefined);
  assert.equal(inputByLabel(tree, 'MAX_EXTRA_PODS'), undefined);
  assert.equal(inputByLabel(tree, 'MAX_UNAVAILABLE_PODS'), undefined);
  const strategy = inputByLabel(tree, 'UPDATE_STRATEGY').props;
  assert.deepEqual(
    Array.from(strategy.options, (option: any) => option.value),
    ['RollingUpdate', 'OnDelete'],
  );
});

test('DaemonSet 使用自己的最大不可用数量，不出现副本或 Deployment maxSurge 字段', () => {
  const Input = loadInput();
  let changed: any;
  const tree = Input({
    kind: 'DaemonSet',
    value: { type: 'RollingUpdate', maxUnavailable: 1 },
    onChange: (next: any) => (changed = next),
  });
  inputByLabel(tree, 'MAX_UNAVAILABLE_PODS').props.onChange({ target: { value: '20%' } });
  assert.equal(changed.maxUnavailable, '20%');
  assert.equal(inputByLabel(tree, 'MAX_EXTRA_PODS'), undefined);
  assert.equal(inputByLabel(tree, 'PARTITION_ORDINAL'), undefined);
  const onDelete = Input({ kind: 'DaemonSet', value: { type: 'OnDelete' } });
  assert.equal(inputByLabel(onDelete, 'MAX_UNAVAILABLE_PODS'), undefined);
});
