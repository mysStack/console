import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const directory = __dirname;
const routes = readFileSync(path.join(directory, 'routes.tsx'), 'utf8');
const list = readFileSync(path.join(directory, 'Workloads/index.tsx'), 'utf8');
const modal = readFileSync(
  path.join(directory, '../../../projects/components/WorkloadCreateModal/index.tsx'),
  'utf8',
);
const resources = readFileSync(
  path.join(
    directory,
    '../../../projects/components/WorkloadCreateModal/useWorkloadResourceOptions.ts',
  ),
  'utf8',
);
const targets = readFileSync(
  path.join(
    directory,
    '../../../projects/components/WorkloadCreateModal/useWorkloadTargetOptions.ts',
  ),
  'utf8',
);

function inspectNativeList(moduleName: 'deployments' | 'statefulsets' | 'daemonsets') {
  const requests: Record<string, any>[] = [];
  const source = ts.transpileModule(list, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const Empty = () => null;
  const NativeList = () => null;
  const CreateModal = () => null;
  const mutation = (type: string) => () => ({
    mutate: (request: any) => requests.push({ type, request }),
    isLoading: false,
  });
  const store = {
    mapper: (value: any) => value,
    useBatchStopDeploymentMutation: mutation('stop'),
    useUpdateDeploymentMutation: mutation('update'),
    useCreateWorkloadMutation: mutation('workload'),
    useCreateStatefulSetMutation: mutation('statefulset'),
  };
  const module = { exports: {} as any };
  runInNewContext(source, {
    module,
    exports: module.exports,
    t: (key: string) => key,
    require: (name: string) => {
      if (name === 'react') {
        return {
          ...React,
          useRef: () => ({ current: { refetch: () => {} } }),
          useState: (value: unknown) => [value, () => {}],
        };
      }
      if (name === 'react-router-dom') {
        return { useParams: () => ({ cluster: 'host' }), Link: Empty };
      }
      if (name === 'lodash') return { get: (value: any, key: string) => value[key] };
      if (name === '@kubed/components') {
        return { notify: { success: () => {}, error: () => {} } };
      }
      if (name === '@kubed/hooks') {
        return { useDisclosure: () => ({ isOpen: false, open: () => {}, close: () => {} }) };
      }
      if (name === '@ks-console/shared') {
        return {
          Avatar: Empty,
          Icon: Empty,
          ListPage: NativeList,
          RecreateModal: Empty,
          StatusReason: Empty,
          StopModal: Empty,
          formatTime: (value: unknown) => value,
          getWorkloadStatus: () => ({ status: '', reason: '' }),
          useActionMenu: () => () => null,
          useCacheStore: () => ['project-a', () => {}],
          useCommonActions: () => ({
            editBaseInfo: () => {},
            editYaml: () => {},
            del: () => {},
          }),
          workloadStore: () => store,
        };
      }
      if (name.endsWith('/WorkloadCreateModal')) return CreateModal;
      return Empty;
    },
  });
  const view = module.exports.default({ module: moduleName });
  const children = React.Children.toArray(view.props.children) as any[];
  return {
    requests,
    list: children.find(child => child.type === NativeList),
    modal: children.find(child => child.type === CreateModal),
  };
}

test('集群级三类 Workload 主路由使用原生列表且不再挂载 V3 Embed', () => {
  assert.match(routes, /import Workloads from ['"]\.\/Workloads\/index['"]/);
  for (const module of ['deployments', 'statefulsets', 'daemonsets']) {
    assert.match(routes, new RegExp(`element: <Workloads module="${module}" \\/>`));
  }
  assert.doesNotMatch(routes, /WorkLoadList|\.\.\/Workload\/Workloads/);
});

test('集群原生列表支持三类创建并保留 namespace 选择', () => {
  assert.match(list, /WorkloadCreateModal/);
  assert.match(list, /useCreateWorkloadMutation/);
  assert.match(list, /useCreateStatefulSetMutation/);
  assert.match(list, /namespaceSelectable/);
  assert.match(list, /useCacheStore\(`\$\{cluster\}-selectedNamespace`\)/);
  assert.match(list, /StatusReason/);
  assert.doesNotMatch(list, /<span>reason<\/span>/);
});

test('创建弹窗在集群入口允许选择 namespace，并按当前选择加载依赖', () => {
  assert.match(modal, /namespaceSelectable\?: boolean/);
  assert.match(modal, /<NamespaceSelector/);
  assert.match(modal, /useWatch\('namespace', form\)/);
  assert.match(modal, /namespace: selectedNamespace/);
  assert.match(modal, /dependencies=\{\['name', 'namespace'\]\}/);
  assert.match(modal, /if \(!watchedNamespace \|\| !name/);
  assert.match(resources, /if \(!namespace\)/);
  assert.match(targets, /if \([^)]*!namespace\)/);
});

for (const [moduleName, kind] of [
  ['deployments', 'Deployment'],
  ['statefulsets', 'StatefulSet'],
  ['daemonsets', 'DaemonSet'],
] as const) {
  test(`集群 ${kind} 创建使用弹窗选择的 namespace 和对应 Store`, () => {
    const inspected = inspectNativeList(moduleName);
    assert.equal(inspected.list.props.hasNamespaceSelector, true);
    assert.equal(inspected.modal.props.namespace, 'project-a');
    assert.equal(inspected.modal.props.namespaceSelectable, true);
    assert.equal(inspected.modal.props.kind, kind);
    const data =
      moduleName === 'statefulsets'
        ? {
            workload: { metadata: { namespace: 'project-b', name: 'native-statefulset' } },
            service: { metadata: { namespace: 'project-b', name: 'native-statefulset-ab12' } },
          }
        : { metadata: { namespace: 'project-b', name: `native-${moduleName}` } };
    inspected.modal.props.onOk(data);
    assert.deepEqual(JSON.parse(JSON.stringify(inspected.requests)), [
      {
        type: moduleName === 'statefulsets' ? 'statefulset' : 'workload',
        request: { params: { cluster: 'host', namespace: 'project-b' }, data },
      },
    ]);
  });
}
