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
    readFileSync(path.join(__dirname, 'ContainerInput.tsx'), 'utf8'),
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
        ? { Input: 'input', InputNumber: 'input-number', Select: 'select', Switch: 'switch' }
        : name === '@ks-console/shared'
          ? { ArrayInput: 'array-input' }
          : name === './SecurityContextInput'
            ? { __esModule: true, default: 'security-context-input' }
            : requireDependency(name),
  });
  return loaded.exports.default;
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}

test('生命周期控件可以启用、修改和移除动作，并保留容器其他草稿', () => {
  const ContainerInput = loadInput();
  const value = {
    name: 'web',
    image: 'nginx:alpine',
    lifecycle: { preStop: { type: 'command', command: ['sleep', '2'] } },
  };
  let changed: any;
  const tree = ContainerInput({
    kind: 'CONTAINER',
    value,
    onChange: (next: any) => (changed = next),
  });
  const life = nodes(tree).find(node => node.props['aria-label'] === 'LIFECYCLE_MANAGEMENT');
  assert.ok(life, '原生容器表单需要生命周期分区');
  const post = nodes(life).find(node => node.props.label === 'POSTSTART_ACTION');
  assert.ok(post);
  const empty = post.type(post.props);
  nodes(empty)
    .find(node => node.props['aria-label'] === 'POSTSTART_ACTION ENABLE')
    .props.onChange(true);
  assert.deepEqual(JSON.parse(JSON.stringify(changed.lifecycle.postStart)), {
    type: 'http',
    path: '/',
    port: 80,
  });
  assert.deepEqual(changed.lifecycle.preStop, { type: 'command', command: ['sleep', '2'] });
  assert.equal(changed.name, 'web');
  const pre = nodes(life).find(node => node.props.label === 'PRESTOP_ACTION');
  const editor = pre.type(pre.props);
  const commandInput = nodes(editor).find(node => node.type === 'array-input');
  assert.ok(commandInput, '生命周期命令使用逐项参数输入，不能用逗号分割 shell 参数');
  commandInput.props.onChange(['printf', '  a,b  ', '']);
  assert.deepEqual(Array.from(changed.lifecycle.preStop.command), ['printf', '  a,b  ', '']);
  nodes(editor)
    .find(node => node.props['aria-label'] === 'PRESTOP_ACTION ENABLE')
    .props.onChange(false);
  assert.equal(changed.lifecycle.preStop, undefined);
  assert.equal(value.lifecycle.preStop.command[1], '2');
  const initTree = ContainerInput({
    kind: 'INIT_CONTAINER',
    value: { name: 'init', image: 'busybox' },
  });
  assert.equal(
    nodes(initTree).find(node => node.props['aria-label'] === 'LIFECYCLE_MANAGEMENT'),
    undefined,
  );
  const sidecar = ContainerInput({
    kind: 'INIT_CONTAINER',
    value: { name: 'sidecar', image: 'busybox', restartPolicy: 'Always' },
  });
  assert.ok(nodes(sidecar).find(node => node.props['aria-label'] === 'LIFECYCLE_MANAGEMENT'));
});

test('生命周期 HTTP 支持 HTTPS 且不显示探针时序，健康检查仍保留时序', () => {
  const ContainerInput = loadInput();
  let changed: any;
  const tree = ContainerInput({
    kind: 'CONTAINER',
    value: {
      name: 'web',
      image: 'nginx:alpine',
      lifecycle: { postStart: { type: 'http', path: '/', port: 80, scheme: 'HTTP' } },
      readinessProbe: { type: 'http', path: '/ready', port: 80 },
    },
    onChange: (next: any) => (changed = next),
  });
  const post = nodes(tree).find(node => node.props.label === 'POSTSTART_ACTION');
  assert.ok(post);
  const life = post.type(post.props);
  const scheme = nodes(life).find(node => node.props['aria-label'] === 'POSTSTART_ACTION PROTOCOL');
  assert.ok(scheme, 'HTTP 生命周期需要协议选择');
  scheme.props.onChange('HTTPS');
  assert.equal(changed.lifecycle.postStart.scheme, 'HTTPS');
  assert.equal(nodes(life).filter(node => node.type === 'input-number').length, 0);
  const probe = nodes(tree).find(node => node.props.label === 'READINESS_PROBE');
  assert.equal(
    nodes(probe.type(probe.props)).filter(node => node.type === 'input-number').length,
    5,
  );
});
