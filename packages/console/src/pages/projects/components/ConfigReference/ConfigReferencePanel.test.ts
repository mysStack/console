import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const dependency = createRequire(__filename);
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}
async function panel(module: string, edit: boolean) {
  let cursor = 0;
  let mounted = false;
  const state: any[] = [];
  const effects: Array<() => void> = [];
  const patches: any[] = [];
  const permissions: any[] = [];
  const data = {
    metadata: { annotations: {} },
    spec: {
      template: {
        spec: {
          containers: [
            { name: 'web', envFrom: [{ configMapRef: { name: 'settings' } }] },
            { name: 'sidecar', envFrom: [{ secretRef: { name: 'fixture' } }] },
          ],
        },
      },
    },
  };
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(path.join(__dirname, 'ConfigReferencePanel.tsx'), 'utf8'), {
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
            useMemo: (fn: () => any) => fn(),
            useEffect: (fn: () => void) => {
              if (!mounted) effects.push(fn);
            },
            useState: (value: any) => {
              const slot = cursor++;
              if (!(slot in state)) state[slot] = value;
              return [
                state[slot],
                (next: any) =>
                  (state[slot] = typeof next === 'function' ? next(state[slot]) : next),
              ];
            },
          };
        if (name === 'react-query')
          return { useMutation: (fn: (value: any) => any) => ({ mutate: fn, isLoading: false }) };
        if (name === '@kubed/components')
          return {
            Button: 'button',
            Card: 'card',
            Input: 'input',
            Select: 'select',
            Switch: 'switch',
            Loading: 'loading',
            notify: { success: () => {}, error: () => {} },
          };
        if (name === '@ks-console/shared')
          return {
            hasPermission: (params: any) => {
              permissions.push(params);
              return (
                edit &&
                params.cluster === 'host' &&
                params.project === 'v4-migration-e2e' &&
                params.module === module &&
                params.action === 'edit'
              );
            },
            workloadStore: (resource: string) => ({
              useGetDetail: () => ({ data, refetch: () => {} }),
              getDetailUrl: ({ namespace }: any) =>
                `/clusters/host/namespaces/${namespace}/${resource}/web`,
            }),
            configMapStore: { fetchNameListByK8s: async () => ['settings'] },
            secretStore: { fetchNameListByK8s: async () => ['fixture'] },
            request: { patch: (...args: any[]) => patches.push(args) },
          };
        if (name === './ConfigReferencePreview') return { __esModule: true, default: 'preview' };
        if (name === './useReferencePreviews') return { useReferencePreviews: () => [] };
        return dependency(name);
      },
    },
  );
  const render = (namespace = 'v4-migration-e2e') => {
    cursor = 0;
    return loaded.exports.default({
      cluster: 'host',
      namespace,
      name: 'web',
      module,
      workloadKind: module,
      onBack: () => {},
    });
  };
  render();
  mounted = true;
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  return { render, patches, permissions };
}

test('三类 Workload 只读用户仍可查看和切换容器，但编辑控件与程序触发提交都不能写入', async () => {
  for (const module of ['deployments', 'statefulsets', 'daemonsets']) {
    const { render, patches } = await panel(module, false);
    let all = nodes(render());
    const selector = all.find(
      node => node.props['aria-label'] === 'CONFIG_REFERENCE_ARIA_CONTAINER',
    );
    assert.notEqual(selector.props.disabled, true, '容器切换保留只读能力');
    assert.ok(all.find(node => node.type === 'preview'));
    for (const node of all.filter(
      node => ['select', 'input', 'switch'].includes(node.type) && node !== selector,
    )) {
      assert.equal(node.props.disabled, true, `${module} 不应暴露可编辑控件`);
    }
    const save = all.find(node => node.props.children === 'CONFIG_REFERENCE_SAVE');
    assert.equal(save.props.disabled, true);
    assert.equal(
      all.find(node => node.props.children === 'CONFIG_REFERENCE_ADD').props.disabled,
      true,
    );
    assert.equal(all.find(node => node.props.children === '删除').props.disabled, true);
    save.props.onClick();
    assert.equal(patches.length, 0, '禁用按钮之外还需要提交函数权限检查');
    selector.props.onChange('sidecar');
    all = nodes(render());
    assert.equal(all.find(node => node.type === 'preview').props.kind, 'secret');
  }
});

test('三类 Workload 编辑权限按当前 cluster/project/module 核对，管理员保存保留原 PATCH 链，切换 namespace 重新限制', async () => {
  for (const module of ['deployments', 'statefulsets', 'daemonsets']) {
    const { render, patches, permissions } = await panel(module, true);
    const save = nodes(render()).find(node => node.props.children === 'CONFIG_REFERENCE_SAVE');
    assert.notEqual(save.props.disabled, true);
    assert.equal(patches.length, 0);
    save.props.onClick();
    assert.equal(patches.length, 1);
    assert.equal(patches[0][0], `/clusters/host/namespaces/v4-migration-e2e/${module}/web`);
    assert.ok(patches[0][1].some((op: any) => op.path.endsWith('/envFrom')));
    assert.equal(patches[0][2].headers['content-type'], 'application/json-patch+json');
    const denied = nodes(render('another-namespace')).find(
      node => node.props.children === 'CONFIG_REFERENCE_SAVE',
    );
    assert.equal(denied.props.disabled, true);
    denied.props.onClick();
    assert.equal(patches.length, 1);
    assert.ok(
      permissions.some(
        p =>
          p.cluster === 'host' &&
          p.project === 'v4-migration-e2e' &&
          p.module === module &&
          p.action === 'edit',
      ),
    );
  }
});
