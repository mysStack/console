import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);

test('节点选择器复用键值输入并保留受控值', () => {
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, 'NodeSelectorInput.tsx'), 'utf8'),
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
      name === '@ks-console/shared'
        ? { PropertiesInput: 'properties-input' }
        : requireDependency(name),
  });
  const value = { zone: 'east' };
  const onChange = () => {};
  const tree = loaded.exports.default({ value, onChange });
  assert.ok(React.isValidElement(tree));
  assert.equal(tree.type, 'properties-input');
  assert.equal(tree.props.value, value);
  assert.equal(tree.props.onChange, onChange);
  assert.equal(tree.props.addText, 'ADD_NODE_SELECTOR');
});
