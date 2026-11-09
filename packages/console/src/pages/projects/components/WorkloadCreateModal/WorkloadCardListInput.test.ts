import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
function loadComponent() {
  const target = path.join(__dirname, 'WorkloadCardListInput.tsx');
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
        if (name === 'react') return React;
        if (name === '@kubed/components') return { Button: 'button' };
        if (name === '@kubed/icons') return { Trash: 'trash' };
        return requireDependency(name);
      },
    },
  );
  return loaded.exports.default;
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}

test('卡片列表按新增入口创建条目，新增入口使用虚线卡片', () => {
  const changes: any[][] = [];
  const CardList = loadComponent();
  const tree = CardList({
    value: [],
    onChange: (next: any[]) => changes.push(next),
    adds: [
      {
        text: 'MOUNT_VOLUME',
        description: 'WORKLOAD_MOUNT_VOLUME_DESC',
        createValue: () => ({ type: 'emptyDir' }),
      },
      { text: 'MOUNT_CONFIGMAP_OR_SECRET', createValue: () => ({ type: 'configMap' }) },
    ],
    children: React.createElement('volume-input'),
  });
  const addEntries = nodes(tree).filter(node => node.props && node.props.entry);
  assert.equal(addEntries.length, 2);
  const firstAdd = nodes(addEntries[0].type(addEntries[0].props)).find(
    node => node.type === 'button',
  );
  assert.match(firstAdd.props.style.border, /dashed/);
  addEntries[1].type(addEntries[1].props).props.onClick();
  assert.equal(JSON.stringify(changes[0]), JSON.stringify([{ type: 'configMap' }]));
});

test('条目内容变化只替换目标项，删除只移除目标项', () => {
  const changes: any[][] = [];
  const CardList = loadComponent();
  const render = () =>
    CardList({
      value: [
        { name: 'a', type: 'emptyDir' },
        { name: 'b', type: 'configMap' },
      ],
      onChange: (next: any[]) => changes.push(next),
      adds: [{ text: 'ADD', createValue: () => ({}) }],
      children: React.createElement('volume-input'),
    });
  const items = () => nodes(render()).filter(node => node.type === 'volume-input');
  assert.equal(items().length, 2);
  items()[1].props.onChange({ name: 'b2', type: 'secret' });
  assert.equal(
    JSON.stringify(changes[0]),
    JSON.stringify([
      { name: 'a', type: 'emptyDir' },
      { name: 'b2', type: 'secret' },
    ]),
  );
  const deleteButtons = nodes(render()).filter(
    node => node.type === 'button' && node.props['aria-label'] === 'DELETE',
  );
  assert.equal(deleteButtons.length, 2);
  deleteButtons[0].props.onClick();
  assert.equal(JSON.stringify(changes[1]), JSON.stringify([{ name: 'b', type: 'configMap' }]));
});
