import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Keep ArrayInput's value and event logic real. Only replace UI dependencies
// that need browser globals; the child row renderer is outside this contract.
const requireDependency = createRequire(__filename);
const moduleSource = ts.transpileModule(readFileSync(path.join(__dirname, 'index.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} as any };
const dependencies: Record<string, unknown> = {
  '@kubed/components': { Button: 'button', FormItem: 'section' },
  './Item': 'input-row',
  './styles': { StyledFooter: 'footer', StyledDesc: 'p' },
};
runInNewContext(moduleSource, {
  module: loaded,
  exports: loaded.exports,
  t: (key: string) => key,
  require: (name: string) => dependencies[name] ?? requireDependency(name),
});
const ArrayInput = loaded.exports.default;
const render = (props: Record<string, any>) =>
  ArrayInput({ addText: 'Add', children: React.createElement('input'), ...props });

test('显式空数组没有虚构行，首次添加只产生一个空对象', () => {
  let changed: unknown;
  const view = render({
    value: [],
    itemType: 'object',
    onChange: (value: unknown) => (changed = value),
  });
  assert.equal(view.props.children[0].length, 0);
  view.props.children[1].props.children[1].props.children[0].props.onClick();
  assert.equal(JSON.stringify(changed), '[{}]');
});

test('删除最后一行后保持空数组，同时保留默认行和已有对象的编辑行为', () => {
  let changed: unknown;
  const values = [{ name: 'web', optional: '' }];
  const view = render({
    value: values,
    itemType: 'object',
    checkItemValid: () => true,
    onChange: (value: unknown) => (changed = value),
  });
  assert.equal(view.props.children[0].length, 1);
  view.props.children[0][0].props.onChange({ name: 'sidecar' });
  assert.equal(JSON.stringify(changed), '[{"name":"sidecar"}]');
  view.props.children[0][0].props.onDelete();
  assert.equal(JSON.stringify(changed), '[]');
  assert.equal(render({ value: changed, itemType: 'object' }).props.children[0].length, 0);
  assert.equal(render({}).props.children[0].length, 1);
  assert.deepEqual(values, [{ name: 'web', optional: '' }]);
});
