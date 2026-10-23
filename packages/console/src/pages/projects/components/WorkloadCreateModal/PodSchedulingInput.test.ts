import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
}

test('Pod 调度控件支持三种预设模式和完整自定义规则', () => {
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, 'PodSchedulingInput.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} as any };
  runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    t: (key: string) => key,
    require: (name: string) =>
      name === '@kubed/components'
        ? { Select: 'select' }
        : name === '@ks-console/shared'
          ? { ArrayInput: 'array-input', ObjectInput: 'object-input' }
          : requireDependency(name),
  });
  let changed: any;
  let tree = loaded.exports.default({
    value: { mode: 'default' },
    targets: ['api', 'worker'],
    onChange: (value: any) => (changed = value),
  });
  const mode = nodes(tree).find(node => node.props['aria-label'] === 'POD_SCHEDULING_RULES');
  assert.deepEqual(
    Array.from(mode.props.options, (option: any) => option.value),
    ['default', 'decentralized', 'aggregation', 'custom'],
  );
  mode.props.onChange('custom');
  assert.deepEqual(JSON.parse(JSON.stringify(changed)), { mode: 'custom', rules: [{}] });

  tree = loaded.exports.default({
    value: {
      mode: 'custom',
      rules: [
        {
          policy: 'podAffinity',
          type: 'requiredDuringSchedulingIgnoredDuringExecution',
          target: 'api',
        },
      ],
    },
    targets: ['api', 'worker'],
    onChange: (value: any) => (changed = value),
  });
  const rules = nodes(tree).find(node => node.type === 'array-input');
  assert.ok(rules);
  assert.equal(rules.props.itemType, 'object');
  assert.equal(rules.props.checkItemValid(rules.props.value[0]), true);
  const target = nodes(rules.props.children).find(node => node.props.name === 'target');
  assert.deepEqual(
    Array.from(target.props.options, (option: any) => option.value),
    ['api', 'worker'],
  );

  tree = loaded.exports.default({ value: { mode: 'preserved' } });
  const preservedMode = nodes(tree).find(
    node => node.props['aria-label'] === 'POD_SCHEDULING_RULES',
  );
  assert.deepEqual(
    Array.from(preservedMode.props.options, (option: any) => option.value),
    ['preserved', 'default', 'decentralized', 'aggregation', 'custom'],
  );
});
