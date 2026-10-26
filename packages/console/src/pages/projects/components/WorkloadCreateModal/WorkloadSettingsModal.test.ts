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
function render(
  kind: string,
  submittedValues?: Record<string, any>,
  resourceOverride?: Record<string, any>,
) {
  const resource = resourceOverride || {
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
                validateFields: () => Promise.resolve(submittedValues || values),
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
    mergeWorkloadSettingsValues: loaded.exports.mergeWorkloadSettingsValues,
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

test('分区导航使用弹窗内的 tab 语义而不改变浏览器路由', () => {
  const { tree } = render('Deployment');
  const all = nodes(tree);
  const nav = all.find(node => node.type === 'nav');
  assert.ok(nav);
  assert.equal(nav.props.role, 'tablist');
  const button = nodes(nav).find(node => node.type === 'button');
  assert.ok(button);
  button.props.onClick();
  assert.equal(button.props.role, 'tab');
  assert.equal(button.props['aria-selected'], true);
  assert.match(button.props['aria-controls'], /^workload-settings-/);
  assert.equal(button.props.href, undefined);
});

test('分区导航只显示当前分区的内容', () => {
  const { tree } = render('Deployment');
  const sections = nodes(tree).filter(node => node.type === 'section');
  const updateStrategy = sections.find(node => node.props['aria-label'] === 'UPDATE_STRATEGY');
  assert.ok(updateStrategy);
  assert.equal(updateStrategy.props.hidden, false);
  assert.ok(
    sections.filter(node => node !== updateStrategy).every(node => node.props.hidden === true),
    '非当前分区不应在弹窗中同时显示',
  );
});

test('编辑设置弹窗使用 release-4.1.5 对照页面的宽度', () => {
  const { tree } = render('Deployment');

  assert.equal(tree.props.width, 1162);
});

test('编辑设置使用与 release-4.1.5 一致的面板层级和策略说明容器', () => {
  const { tree } = render('Deployment');
  const all = nodes(tree);

  assert.ok(all.find(node => node.props['data-test'] === 'workload-settings-nav'));
  assert.ok(all.find(node => node.props['data-test'] === 'workload-settings-panel'));
});

test('编辑设置首屏沿用 release-4.1.5 的设置边界，不重复显示基础信息和副本数', () => {
  const { tree } = render('Deployment');
  const all = nodes(tree);
  const nav = all.find(node => node.type === 'nav');
  assert.ok(nav);

  const sectionLabels = nodes(nav)
    .filter(node => node.type === 'button')
    .map(node => node.props.children);
  assert.deepEqual(sectionLabels, [
    'UPDATE_STRATEGY',
    'CONTAINER_PL',
    'STORAGE',
    'POD_SCHEDULING_RULES',
    'WORKLOAD_TERMINATION_GRACE_PERIOD',
  ]);

  for (const field of ['name', 'namespace', 'replicas']) {
    assert.equal(
      all.some(node => node.props.name === field),
      false,
      `release-4.1.5 编辑设置不应显示 ${field} 字段`,
    );
  }
});

test('编辑设置隐藏基础字段时，提交仍保留未展示的副本数和元数据', async () => {
  const resource = {
    kind: 'Deployment',
    metadata: {
      name: 'web',
      namespace: 'v4-migration-e2e',
      labels: { app: 'web', 'example.com/owner': 'before' },
      annotations: { 'example.com/owner': 'before' },
    },
    spec: {
      replicas: 2,
      template: {
        metadata: { annotations: { 'example.com/pod': 'before' } },
        spec: { containers: [{ name: 'web', image: 'nginx' }] },
      },
    },
  };
  const values = dependency('./deployment').parseDeploymentSettings(resource);
  const { tree, saved } = render(
    'Deployment',
    {
      containers: values.containers,
      initContainers: values.initContainers,
      volumes: values.volumes,
      updateStrategy: values.updateStrategy,
      podScheduling: values.podScheduling,
      podSecurityContext: values.podSecurityContext,
      terminationGracePeriodSeconds: values.terminationGracePeriodSeconds,
    },
    resource,
  );

  await tree.props.onOk();
  await Promise.resolve();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].spec.replicas, 2);
  assert.deepEqual(saved[0].metadata.labels, resource.metadata.labels);
  assert.deepEqual(saved[0].metadata.annotations, resource.metadata.annotations);
  assert.deepEqual(saved[0].spec.template.metadata.annotations, {
    'example.com/pod': 'before',
  });
});

test('编辑设置校验隐藏基础字段时仍合并初始副本数', () => {
  const { mergeWorkloadSettingsValues } = render('Deployment');
  assert.equal(typeof mergeWorkloadSettingsValues, 'function');
  const values = mergeWorkloadSettingsValues(
    { replicas: 2, terminationGracePeriodSeconds: 30 },
    { terminationGracePeriodSeconds: 31 },
  );
  assert.equal(values.replicas, 2);

  const source = readFileSync(path.join(__dirname, 'WorkloadSettingsModal.tsx'), 'utf8');
  assert.match(
    source,
    /validateWorkloadSettings\(\s*resource,\s*mergeWorkloadSettingsValues\(initialValues,\s*form\.getFieldsValue\(\)\s*\)\s*,?\s*\)/s,
  );
});
