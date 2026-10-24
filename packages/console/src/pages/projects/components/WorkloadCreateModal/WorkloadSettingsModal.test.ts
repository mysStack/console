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
function render(kind: string) {
  const resource = {
    kind,
    metadata: { name: 'web', namespace: 'v4-migration-e2e' },
    spec: {
      replicas: 1,
      template: { metadata: {}, spec: { containers: [{ name: 'web', image: 'nginx' }] } },
    },
  };
  const values = dependency('./deployment').parseDeploymentSettings(resource);
  const saved: any[] = [];
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(path.join(__dirname, 'WorkloadSettingsModal.tsx'), 'utf8'), {
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
            useRef: () => ({ current: {} }),
            useState: (value: any) => [value, () => {}],
          };
        if (name === '@kubed/components')
          return {
            Form: 'form',
            FormItem: 'form-item',
            Input: 'input',
            InputNumber: 'number',
            Modal: 'modal',
            Button: 'button',
            useForm: () => [
              {
                getFieldValue: (key: string) => values[key],
                getFieldsValue: () => values,
                validateFields: () => Promise.resolve(values),
              },
            ],
            useWatch: (key: string) => values[key],
          };
        if (name === '@ks-console/shared')
          return { ArrayInput: 'array-input', PropertiesInput: 'properties-input' };
        if (name === './deployment') return dependency(name);
        if (name.startsWith('./useWorkload'))
          return {
            __esModule: true,
            default: () => ({ options: {}, isLoading: false, isError: false }),
          };
        if (name.startsWith('./')) return { __esModule: true, default: name.slice(2) };
        return dependency(name);
      },
    },
  );
  return {
    tree: loaded.exports.default({
      visible: true,
      cluster: 'host',
      namespace: 'v4-migration-e2e',
      resource,
      onCancel: () => {},
      onOk: (next: any) => saved.push(next),
    }),
    saved,
  };
}

test('三类设置均提供分区导航，字段保留挂载并区分 DaemonSet 调度与 StatefulSet PVC', async () => {
  for (const kind of ['Deployment', 'StatefulSet', 'DaemonSet']) {
    const { tree, saved } = render(kind);
    const all = nodes(tree);
    assert.ok(
      all.find(node => node.type === 'nav'),
      `${kind} 缺少设置分区导航`,
    );
    assert.ok(
      all.find(
        node =>
          node.type === 'button' && node.props.children === 'WORKLOAD_TERMINATION_GRACE_PERIOD',
      ),
      `${kind} 缺少独立的容器组优雅终止导航`,
    );
    const sections = all.filter(node => node.type === 'section');
    assert.ok(sections.length >= 3);
    assert.ok(
      sections.find(node => node.props['aria-label'] === 'WORKLOAD_TERMINATION_GRACE_PERIOD'),
      `${kind} 缺少独立的容器组优雅终止分区`,
    );
    assert.ok(
      all.find(node => node.type === 'ContainerSettingsInput'),
      '容器使用二级编辑入口',
    );
    for (const field of [
      'updateStrategy',
      'containers',
      'initContainers',
      'volumes',
      'podSecurityContext',
      'terminationGracePeriodSeconds',
      'workloadLabels',
      'workloadAnnotations',
      'podAnnotations',
    ]) {
      assert.ok(
        all.find(node => node.props.name === field),
        `${kind} 必须保留 ${field}`,
      );
    }
    assert.equal(!!all.find(node => node.props.name === 'podScheduling'), kind !== 'DaemonSet');
    assert.equal(
      !!all.find(node => node.props.name === 'volumeClaimTemplates'),
      kind === 'StatefulSet',
    );
    await tree.props.onOk();
    await Promise.resolve();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].kind, kind);
  }
});

test('分区导航滚动到当前弹窗对应分区而不改变浏览器路由', () => {
  const { tree } = render('Deployment');
  const all = nodes(tree);
  const nav = all.find(node => node.type === 'nav');
  assert.ok(nav);
  const section = all.find(node => node.type === 'section');
  let scrolls = 0;
  section.ref({ scrollIntoView: () => scrolls++ });
  const button = nodes(nav).find(node => node.type === 'button');
  assert.ok(button);
  button.props.onClick();
  assert.equal(scrolls, 1);
  assert.equal(button.props.href, undefined);
});
