import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const dependency = createRequire(__filename);
function loadInputs() {
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(path.join(__dirname, 'ContainerInput.tsx'), 'utf8'), {
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
      globals: { config: { supportGpuType: [] } },
      require: (name: string) =>
        name === '@kubed/components'
          ? {
              Input: 'input',
              InputNumber: 'number',
              Select: 'select',
              Switch: 'switch',
              AutoComplete: 'autocomplete',
            }
          : name === '@ks-console/shared'
            ? { ArrayInput: 'array-input' }
            : name === './useWorkloadEnvironmentKeys'
              ? {
                  __esModule: true,
                  default: () => ({ data: ['item'], isLoading: false, isError: false }),
                }
              : name === './SecurityContextInput'
                ? { __esModule: true, default: 'security-context' }
                : dependency(name),
    },
  );
  const tree = loaded.exports.default({ kind: 'CONTAINER', resourceOptions: options });
  const all = nodes(tree);
  const env = all.find(node => node.props.addText === 'WORKLOAD_ADD_ENV').props.children;
  const envFrom = all.find(node => node.props.addText === 'WORKLOAD_ADD_CONFIG_REFERENCE').props
    .children;
  assert.deepEqual(env.props.resourceOptions, options, '变量引用需要当前 namespace 的资源选项');
  return {
    EnvironmentInput: (props: any) => env.type({ ...env.props, ...props }),
    EnvironmentFromInput: (props: any) => envFrom.type({ ...envFrom.props, ...props }),
  };
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}
const normalize = (value: any) => JSON.parse(JSON.stringify(value));
const options = { configMaps: ['settings'], secrets: ['fixture'], persistentVolumeClaims: [] };

test('环境引用类型切换互斥，Secret 只显示名称和 key，键名可以下拉选择', () => {
  const { EnvironmentInput } = loadInputs();
  let changed: any;
  const value = {
    name: 'ITEM',
    valueFrom: { secretKeyRef: { name: 'fixture', key: 'item', optional: true } },
  };
  const render = (item: any) =>
    nodes(
      EnvironmentInput({
        value: item,
        resourceOptions: options,
        onChange: (next: any) => (changed = next),
      }),
    );
  let all = render(value);
  const type = all.find(node => node.props['aria-label'] === 'WORKLOAD_ENV_SOURCE');
  assert.equal(type.props.value, 'secretKeyRef');
  const resource = all.find(node => node.props['aria-label'] === 'WORKLOAD_REFERENCE_RESOURCE');
  assert.deepEqual(normalize(resource.props.options), [{ label: 'fixture', value: 'fixture' }]);
  const key = all.find(node => node.props['aria-label'] === 'KEY_IN_RESOURCE');
  assert.equal(key.type, 'autocomplete', '当前 V3 的资源键选择需要下拉建议');
  assert.deepEqual(normalize(key.props.options), [{ label: 'item', value: 'item' }]);
  key.props.onChange('other');
  assert.equal(changed.valueFrom.secretKeyRef.key, 'other');
  assert.equal(value.valueFrom.secretKeyRef.key, 'item');
  assert.equal(
    all.find(node => node.props['aria-label'] === 'KEY_IN_RESOURCE').props.value,
    'item',
  );
  all
    .find(node => node.props['aria-label'] === 'WORKLOAD_REFERENCE_OPTIONAL')
    .props.onChange(false);
  assert.equal(changed.valueFrom.secretKeyRef.optional, false);
  assert.equal(value.valueFrom.secretKeyRef.optional, true);
  type.props.onChange('literal');
  assert.deepEqual(normalize(changed), { name: 'ITEM', value: '' });
  all = render(changed);
  all
    .find(node => node.props['aria-label'] === 'WORKLOAD_ENV_SOURCE')
    .props.onChange('configMapKeyRef');
  assert.equal('value' in changed, false);
  assert.deepEqual(normalize(changed.valueFrom), { configMapKeyRef: { name: '', key: '' } });
  render(value)
    .find(node => node.props['aria-label'] === 'WORKLOAD_REFERENCE_RESOURCE')
    .props.onChange('another');
  assert.equal(changed.valueFrom.secretKeyRef.key, '', '切换引用资源清空旧 key');
});

test('已存字段与资源引用可原生修改，保留 apiVersion，并可编辑 envFrom optional', () => {
  const { EnvironmentInput, EnvironmentFromInput } = loadInputs();
  let changed: any;
  const props = { resourceOptions: options, onChange: (next: any) => (changed = next) };
  let all = nodes(
    EnvironmentInput({
      ...props,
      value: {
        name: 'POD',
        valueFrom: { fieldRef: { apiVersion: 'v1', fieldPath: 'metadata.name' } },
      },
    }),
  );
  all
    .find(node => node.props['aria-label'] === 'WORKLOAD_ENV_FIELD_PATH')
    .props.onChange({ target: { value: 'metadata.namespace' } });
  assert.deepEqual(normalize(changed.valueFrom), {
    fieldRef: { apiVersion: 'v1', fieldPath: 'metadata.namespace' },
  });
  all = nodes(
    EnvironmentInput({
      ...props,
      value: {
        name: 'CPU',
        valueFrom: { resourceFieldRef: { resource: 'limits.cpu', divisor: '1m' } },
      },
    }),
  );
  all
    .find(node => node.props['aria-label'] === 'WORKLOAD_ENV_DIVISOR')
    .props.onChange({ target: { value: '1' } });
  assert.deepEqual(normalize(changed.valueFrom), {
    resourceFieldRef: { resource: 'limits.cpu', divisor: '1' },
  });
  all = nodes(
    EnvironmentFromInput({ ...props, value: { kind: 'secret', name: 'fixture', optional: true } }),
  );
  all
    .find(node => node.props['aria-label'] === 'WORKLOAD_REFERENCE_OPTIONAL')
    .props.onChange(false);
  assert.deepEqual(normalize(changed), { kind: 'secret', name: 'fixture', optional: false });
});
