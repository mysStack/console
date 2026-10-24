import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const requireDependency = createRequire(__filename);
const params = {
  workspace: 'test-ws',
  cluster: 'host',
  namespace: 'v4-migration-e2e',
  name: 'native-settings',
};
const noop = () => {};

function renderDetail(kind: string, resource: string, rejectLoad = false) {
  let page: any;
  const requests: string[] = [];
  const errors: string[] = [];
  let yamlCalls = 0;
  let opened = 0;
  const raw = {
    kind,
    metadata: { name: params.name, namespace: params.namespace, resourceVersion: '42' },
    spec: { template: { spec: { containers: [{ name: 'web', image: 'nginx' }] } } },
  };
  const detail = { ...raw, ...params, _originData: raw };
  const result = { mutate: noop, isLoading: false, reset: noop };
  const url = `/clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/${resource}/native-settings`;
  const store = {
    useGetDetail: () => ({ data: detail, isLoading: false, isError: false, refetch: noop }),
    usePutMutation: (_params: unknown, options: any) => {
      assert.equal(options.noGetDetail, true, '保存时必须保留打开设置时的 resourceVersion');
      return result;
    },
    useUpdateDeploymentMutation: () => result,
    useDeleteDeploymentMutation: () => result,
    useRollbackMutation: () => result,
    getWatchListUrl: () => url,
    getDetailUrl: (scope: any) => {
      assert.equal(scope.cluster, 'host');
      assert.equal(scope.namespace, 'v4-migration-e2e');
      assert.equal(scope.name, 'native-settings');
      return url;
    },
  };
  const shared = {
    useCacheStore: React.useState,
    workloadStore: () => store,
    useWebSocket: noop,
    DetailPagee: (props: any) => {
      page = props;
      return null;
    },
    getDisplayName: () => params.name,
    formatTime: () => '',
    useCommonActions: () => ({ editBaseInfo: noop, editYaml: () => yamlCalls++ }),
    hasClusterModule: () => false,
    hpaStore: { usePatchHpaMutation: () => result },
    request: {
      get: async (value: string) => {
        requests.push(value);
        if (rejectLoad) throw Object.assign(new Error('Forbidden'), { response: { status: 403 } });
        return raw;
      },
    },
  };
  const modalHooks = {
    useRollbackModal: () => ({ renderRollbackModal: () => null, setRollbackVisible: noop }),
    useAutoScalingModal: () => ({ renderAutoScalingModal: () => null, setScaleVisible: noop }),
    useWorkloadService: () => ({ editWorkloadService: noop }),
    useBaseInfoModal: () => ({ renderBaseInfoModal: () => null, setEditBaseInfoVisible: noop }),
  };
  const relative = `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/${kind}s/Detail/index.tsx`;
  // 可选历史输入只用于复现回归；不覆盖工作树或改写 Git 历史。
  const input = process.env.WORKLOAD_SETTINGS_TEST_REVISION
    ? execFileSync('git', ['show', `${process.env.WORKLOAD_SETTINGS_TEST_REVISION}:${relative}`], {
        encoding: 'utf8',
      })
    : readFileSync(path.join(__dirname, `${kind}s/Detail/index.tsx`), 'utf8');
  const source = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} as any };
  runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    t: (key: string) => key,
    globals: { clusterConfig: { host: {} } },
    require: (name: string) => {
      if (name === '@ks-console/shared') return shared;
      if (name === '@kubed/components')
        return {
          Loading: () => null,
          notify: { success: noop, error: (value: string) => errors.push(value) },
        };
      if (name === '@kubed/hooks')
        return { useDisclosure: () => ({ isOpen: false, open: () => opened++, close: noop }) };
      if (name === '@kubed/icons')
        return {
          Pen: () => null,
          TimedTask: () => null,
          Restart: () => null,
          Firewall: () => null,
          Trash: () => null,
          Storage: () => null,
        };
      if (name === 'react-router-dom') return { useParams: () => params, useNavigate: () => noop };
      if (name.endsWith('/hooks/useModal')) return modalHooks;
      if (name.endsWith('/components/WorkloadCreateModal'))
        return { WorkloadSettingsModal: () => null };
      return requireDependency(name);
    },
  });
  renderToStaticMarkup(React.createElement(loaded.exports.default));
  return {
    action: page.cardProps.actions.find((item: any) => item.key === 'editConfigTemplate'),
    requests,
    errors,
    yamlCalls: () => yamlCalls,
    opened: () => opened,
    url,
  };
}

for (const [kind, resource] of [
  ['Deployment', 'deployments'],
  ['StatefulSet', 'statefulsets'],
  ['DaemonSet', 'daemonsets'],
]) {
  test(`${kind} 编辑设置读取当前 namespace 原始资源并打开独立设置，不打开 YAML`, async () => {
    const view = renderDetail(kind, resource);
    assert.equal(view.action.action, 'edit');
    await view.action.onClick();
    assert.deepEqual(view.requests, [view.url]);
    assert.equal(view.yamlCalls(), 0);
    assert.equal(view.opened(), 1);
    assert.deepEqual(view.errors, []);
  });
  test(`${kind} 原始设置读取失败时显示错误，不打开设置或 YAML`, async () => {
    const view = renderDetail(kind, resource, true);
    await view.action.onClick();
    assert.deepEqual(view.requests, [view.url]);
    assert.equal(view.yamlCalls(), 0);
    assert.equal(view.opened(), 0);
    assert.deepEqual(view.errors, ['WORKLOAD_SETTINGS_LOAD_FAILED']);
  });
}
