import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
function loadInput() {
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, 'SecurityContextInput.tsx'), 'utf8'),
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
        ? { Input: 'input', InputNumber: 'input-number', Switch: 'switch' }
        : name === '@ks-console/shared'
          ? { ArrayInput: 'array-input' }
          : requireDependency(name),
  });
  return loaded.exports.default;
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}

test('容器安全上下文支持显式启用、布尔值、UID/GID、SELinux 和 capabilities', () => {
  const SecurityContextInput = loadInput();
  let changed: any = 'unchanged';
  let tree = SecurityContextInput({
    kind: 'container',
    onChange: (value: any) => (changed = value),
  });
  const enable = nodes(tree).find(
    node => node.type === 'switch' && node.props['aria-label'] === 'CONTAINER_SECURITY_CONTEXT',
  );
  assert.ok(enable);
  enable.props.onChange(true);
  assert.deepEqual(JSON.parse(JSON.stringify(changed)), {});

  const value = {
    privileged: false,
    runAsNonRoot: true,
    runAsUser: 1000,
    capabilities: { add: ['NET_BIND_SERVICE'] },
  };
  tree = SecurityContextInput({
    kind: 'container',
    value,
    onChange: (next: any) => (changed = next),
  });
  nodes(tree)
    .find(node => node.props['aria-label'] === 'PRIVILEGED_MODE')
    .props.onChange(true);
  assert.equal(changed.privileged, true);
  assert.equal(changed.runAsUser, 1000);
  nodes(tree)
    .find(node => node.props['aria-label'] === 'USER')
    .props.onChange(1001);
  assert.equal(changed.runAsUser, 1001);
  nodes(tree)
    .find(node => node.props['aria-label'] === 'CAPABILITIES ADD')
    .props.onChange(['SYS_TIME']);
  assert.deepEqual(Array.from(changed.capabilities.add), ['SYS_TIME']);
  assert.equal(value.runAsUser, 1000);
});

test('Pod 安全上下文只显示 Pod 支持字段，并可显式清空', () => {
  const SecurityContextInput = loadInput();
  let changed: any;
  const tree = SecurityContextInput({
    kind: 'pod',
    value: { runAsNonRoot: true, seLinuxOptions: { type: 'container_t' } },
    onChange: (next: any) => (changed = next),
  });
  const all = nodes(tree);
  assert.ok(all.find(node => node.props['aria-label'] === 'RUN_AS_NON_ROOT'));
  assert.ok(all.find(node => node.props['aria-label'] === 'SELINUX_CONTEXT TYPE'));
  assert.equal(
    all.find(node => node.props['aria-label'] === 'PRIVILEGED_MODE'),
    undefined,
  );
  assert.equal(
    all.find(node => node.props['aria-label'] === 'CAPABILITIES ADD'),
    undefined,
  );
  all
    .find(node => node.type === 'switch' && node.props['aria-label'] === 'POD_SECURITY_CONTEXT')
    .props.onChange(false);
  assert.equal(changed, undefined);
});
