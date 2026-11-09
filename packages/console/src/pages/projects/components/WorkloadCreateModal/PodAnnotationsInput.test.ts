import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);

test('Pod 注解输入隐藏配置中的保留注解并保留表单受控属性', () => {
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, 'PodAnnotationsInput.tsx'), 'utf8'),
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
    globals: { config: { preservedAnnotations: ['.*kubesphere.io/', 'openpitrix_runtime'] } },
    require: (name: string) =>
      name === '@ks-console/shared'
        ? { PropertiesInput: 'properties-input' }
        : requireDependency(name),
  });
  const value = {
    'example.com/editable': 'before',
    'kubesphere.io/restartedAt': 'kept',
  };
  const onChange = () => {};
  const tree = loaded.exports.default({ value, onChange });

  assert.ok(React.isValidElement(tree));
  assert.equal(tree.type, 'properties-input');
  assert.deepEqual(Array.from(tree.props.hiddenKeys), ['.*kubesphere.io/', 'openpitrix_runtime']);
  assert.equal(tree.props.value, value);
  assert.equal(tree.props.onChange, onChange);
  assert.equal(tree.props.addText, 'ADD');
});
