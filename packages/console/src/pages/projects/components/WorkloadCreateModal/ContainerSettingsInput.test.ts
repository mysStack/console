import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
function renderEditor(props: any) {
  const target = path.join(__dirname, 'ContainerSettingsInput.tsx');
  assert.ok(existsSync(target), '设置页需要原生容器摘要与二级编辑器');
  let cursor = 0;
  const state: any[] = [];
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(target, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      t: (key: string) => key,
      require: (name: string) => {
        if (name === 'react')
          return {
            ...React,
            useState: (initial: any) => {
              const slot = cursor++;
              if (!(slot in state)) state[slot] = initial;
              return [
                state[slot],
                (next: any) => {
                  state[slot] = next;
                },
              ];
            },
          };
        if (name === '@kubed/components') return { Button: 'button', Modal: 'modal' };
        if (name === './ContainerInput') return { __esModule: true, default: 'container-input' };
        if (name === './deployment') return requireDependency('./deployment');
        return requireDependency(name);
      },
    },
  );
  return () => {
    cursor = 0;
    return loaded.exports.default(props);
  };
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}

test('容器二级编辑保留原值，取消丢弃草稿，确认才回写外层表单', () => {
  const value = { name: 'web', image: 'nginx', originalName: 'web', custom: { preserved: true } };
  const changes: any[] = [];
  const render = renderEditor({
    kind: 'CONTAINER',
    value,
    onChange: (next: any) => changes.push(next),
  });
  const open = () =>
    nodes(render())
      .find(node => node.type === 'button')
      .props.onClick();
  open();
  nodes(render())
    .find(node => node.type === 'container-input')
    .props.onChange({ ...value, image: 'nginx:alpine' });
  assert.equal(changes.length, 0);
  nodes(render())
    .find(node => node.type === 'modal')
    .props.onCancel();
  open();
  assert.equal(
    nodes(render()).find(node => node.type === 'container-input').props.value.image,
    'nginx',
  );
  nodes(render())
    .find(node => node.type === 'container-input')
    .props.onChange({ ...value, image: 'nginx:alpine' });
  nodes(render())
    .find(node => node.type === 'modal')
    .props.onOk();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].image, 'nginx:alpine');
  assert.equal(changes[0].originalName, 'web');
  assert.equal(changes[0].custom.preserved, true);
  assert.equal(value.image, 'nginx');
  assert.equal(
    nodes(render()).some(node => node.type === 'modal'),
    false,
  );
});

test('无效容器保留二级编辑和错误提示，StatefulSet 卷模板名可作挂载来源', () => {
  const changes: any[] = [];
  const render = renderEditor({
    kind: 'CONTAINER',
    value: { name: 'web', image: '' },
    volumeNames: ['data'],
    onChange: (next: any) => changes.push(next),
  });
  nodes(render())
    .find(node => node.type === 'button')
    .props.onClick();
  nodes(render())
    .find(node => node.type === 'modal')
    .props.onOk();
  assert.equal(changes.length, 0);
  assert.ok(nodes(render()).find(node => node.props.role === 'alert'));
  nodes(render())
    .find(node => node.type === 'container-input')
    .props.onChange({
      name: 'web',
      image: 'nginx',
      volumeMounts: [{ name: 'data', mountPath: '/data' }],
    });
  nodes(render())
    .find(node => node.type === 'modal')
    .props.onOk();
  assert.equal(changes.length, 1);
});
