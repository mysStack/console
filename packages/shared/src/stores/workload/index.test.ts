import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { MutationObserver, QueryClient, setLogger } from 'react-query';
import ts from 'typescript';

// The UI barrels require browser globals. Keep the Store and React Query mutation
// lifecycle real, replacing only its browser-bound imports and request boundary.
const requireDependency = createRequire(__filename);
const source = ts.transpileModule(readFileSync(path.join(__dirname, 'index.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
setLogger({ log: console.log, warn: console.warn, error: () => {} });

function loadStore(
  moduleName: string,
  send: (url: string, data?: unknown) => Promise<unknown> = async () => ({ status: 'Success' }),
) {
  const client = new QueryClient();
  const module = { exports: {} as any };
  const request = {
    delete: send,
    patch: (url: string, data: unknown) => send(url, data),
    post: send,
  };
  const dependencies: Record<string, unknown> = {
    'react-query': {
      useMutation: (mutationFn: any, options: any) =>
        new MutationObserver(client, { ...options, mutationFn, retry: false }),
    },
    '../store': ({ module: resourceModule }: any) => ({
      getDetailUrl: ({ name }: any) => name,
      post: (params: any, data: any) => {
        const scope = `${params.cluster}:${params.namespace}:${data.metadata.name}`;
        const mode = params.dryRun ? 'dry-run' : 'persist';
        return send(`create:${resourceModule}:${scope}:${mode}`, data);
      },
      delete: (params: any) => {
        const scope = `${params.cluster}:${params.namespace}:${params.name}`;
        return send(`delete:${resourceModule}:${scope}`);
      },
    }),
    '../../utils': { request },
    '../../utils/object.mapper': { [moduleName]: (value: unknown) => value },
    '../volume': {},
    './hpa': { deleteHpa: ({ name }: any) => send(name) },
  };
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name: string) => dependencies[name] ?? requireDependency(name),
    Promise,
  });
  return module.exports.default(moduleName);
}

const item = { cluster: 'host', namespace: 'v4-migration-e2e', name: 'workload-test' };

for (const resource of ['deployments', 'statefulsets', 'daemonsets']) {
  for (const { hook, params, error } of [
    {
      hook: 'useDeleteDeploymentMutation',
      params: item,
      error: Object.assign(new Error('Forbidden'), { response: { status: 403 } }),
    },
    {
      hook: 'useBatchDeleteWorkloadMutation',
      params: { data: [item] },
      error: Object.assign(new Error('Internal Server Error'), { response: { status: 500 } }),
    },
    {
      hook: 'useBatchStopDeploymentMutation',
      params: { data: [item] },
      error: new Error('Network Error'),
    },
  ]) {
    test(`${resource} ${hook} rejects request failures without reporting success`, async () => {
      let successes = 0;
      const store = loadStore(resource, async () => {
        throw error;
      });
      const mutation = store[hook]({ onSuccess: () => successes++ });

      await assert.rejects(mutation.mutate(params), reason => reason === error);
      assert.equal(successes, 0);
      assert.equal(mutation.getCurrentResult().isError, true);
    });
  }

  test(`${resource} successful delete and stop operations still report success once`, async () => {
    const store = loadStore(resource);
    for (const [hook, params] of [
      ['useDeleteDeploymentMutation', item],
      ['useBatchDeleteWorkloadMutation', { data: [item] }],
      ['useBatchStopDeploymentMutation', { data: [item] }],
    ] as const) {
      let successes = 0;
      const mutation = store[hook]({ onSuccess: () => successes++ });
      await mutation.mutate(params);
      assert.equal(successes, 1);
      assert.equal(mutation.getCurrentResult().isSuccess, true);
    }
  });
}

test('single delete rejects when related HPA cleanup fails', async () => {
  const error = new Error('HPA forbidden');
  const store = loadStore('deployments', async name => {
    if (name === 'related-hpa') throw error;
    return { status: 'Success' };
  });
  const mutation = store.useDeleteDeploymentMutation();
  await assert.rejects(
    mutation.mutate({ ...item, annotations: { 'kubesphere.io/relatedHPA': 'related-hpa' } }),
    reason => reason === error,
  );
});

test('StatefulSet 单项删除同时清理原生创建时登记的 Headless Service', async () => {
  const calls: string[] = [];
  const store = loadStore('statefulsets', async url => {
    calls.push(url);
    return { status: 'Success' };
  });

  await store.useDeleteDeploymentMutation().mutate({
    ...item,
    annotations: { 'kubesphere.io/related-service': 'workload-test-headless' },
  });

  assert.deepEqual(calls, [
    'delete:services:host:v4-migration-e2e:workload-test-headless',
    'workload-test',
  ]);
});

test('StatefulSet 批量删除清理登记的 Headless Service，其他资源不误删同名 Service', async () => {
  for (const resource of ['statefulsets', 'deployments']) {
    const calls: string[] = [];
    const store = loadStore(resource, async url => {
      calls.push(url);
      return { status: 'Success' };
    });

    await store.batchDelete([
      {
        ...item,
        annotations: { 'kubesphere.io/related-service': 'workload-test-headless' },
      },
    ]);

    assert.deepEqual(
      calls,
      resource === 'statefulsets'
        ? ['workload-test', 'delete:services:host:v4-migration-e2e:workload-test-headless']
        : ['workload-test'],
    );
  }
});

test('direct batchDelete rejects failures for callers outside the list hooks', async () => {
  const error = new Error('Forbidden');
  const store = loadStore('deployments', async () => {
    throw error;
  });
  await assert.rejects(store.batchDelete([item]), reason => reason === error);
});

test('direct batchDelete rejects related HPA cleanup failures', async () => {
  const error = new Error('HPA forbidden');
  const store = loadStore('deployments', async name => {
    if (name === 'related-hpa') throw error;
    return { status: 'Success' };
  });
  await assert.rejects(
    store.batchDelete([{ ...item, annotations: { 'kubesphere.io/relatedHPA': 'related-hpa' } }]),
    reason => reason === error,
  );
});

test('mixed batch results reject after every in-flight operation finishes', async () => {
  const error = new Error('Forbidden');
  let finish: (value: unknown) => void = () => {};
  let finished = false;
  const pending = new Promise(resolve => {
    finish = resolve;
  });
  const store = loadStore('deployments', name =>
    name === 'pending' ? pending : Promise.reject(error),
  );
  const mutation = store.useBatchDeleteWorkloadMutation();
  const operation = mutation.mutate({ data: [item, { ...item, name: 'pending' }] });
  const rejection = assert.rejects(operation, reason => reason === error);
  operation.then(
    () => (finished = true),
    () => (finished = true),
  );
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  assert.equal(mutation.getCurrentResult().isLoading, true);
  finish({ status: 'Success' });
  await rejection;
});

test('empty batches finish successfully without sending requests', async () => {
  const store = loadStore('deployments', async () => {
    assert.fail('empty batch must not send requests');
  });
  assert.deepEqual(await store.batchDelete([]), []);
  for (const hook of ['useBatchDeleteWorkloadMutation', 'useBatchStopDeploymentMutation']) {
    const mutation = store[hook]();
    await mutation.mutate({ data: [] });
    assert.equal(mutation.getCurrentResult().isSuccess, true);
  }
});

test('停止操作按资源类型生成副本或 DaemonSet 节点选择补丁', async () => {
  for (const [resource, expected] of [
    ['deployments', { spec: { replicas: 0 } }],
    ['statefulsets', { spec: { replicas: 0 } }],
    ['daemonsets', { spec: { template: { spec: { nodeSelector: { 'non-existing': 'true' } } } } }],
  ] as const) {
    const calls: Array<{ url: string; data: unknown }> = [];
    const store = loadStore(resource, async (url, data) => {
      calls.push({ url, data });
      return { status: 'Success' };
    });
    await store.useBatchStopDeploymentMutation().mutate({ data: [item] });
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ url: item.name, data: expected }]);
  }
});

test('native workload create mutation keeps the cluster and namespace scope', async () => {
  const calls: string[] = [];
  let successes = 0;
  const store = loadStore('deployments', async url => {
    calls.push(url);
    return { status: 'Success' };
  });
  const mutation = store.useCreateWorkloadMutation({ onSuccess: () => successes++ });

  await mutation.mutate({
    params: { cluster: 'host', namespace: 'v4-migration-e2e' },
    data: { metadata: { name: 'native-deployment' } },
  });

  assert.deepEqual(calls, ['create:deployments:host:v4-migration-e2e:native-deployment:persist']);
  assert.equal(successes, 1);
});

test('StatefulSet 双资源创建先全部 dry-run，再依次持久化 Service 和 Workload', async () => {
  const calls: string[] = [];
  const store = loadStore('statefulsets', async url => {
    calls.push(url);
    return { status: 'Success' };
  });
  await store.useCreateStatefulSetMutation().mutate({
    params: { cluster: 'host', namespace: 'v4-migration-e2e' },
    data: {
      workload: { metadata: { name: 'native-statefulset' } },
      service: { metadata: { name: 'native-statefulset-ab12' } },
    },
  });

  assert.deepEqual(calls, [
    'create:statefulsets:host:v4-migration-e2e:native-statefulset:dry-run',
    'create:services:host:v4-migration-e2e:native-statefulset-ab12:dry-run',
    'create:services:host:v4-migration-e2e:native-statefulset-ab12:persist',
    'create:statefulsets:host:v4-migration-e2e:native-statefulset:persist',
  ]);
});

test('StatefulSet 任一 dry-run 失败时不发送实际创建请求', async () => {
  const error = new Error('Service invalid');
  const calls: string[] = [];
  const store = loadStore('statefulsets', async url => {
    calls.push(url);
    if (url.includes('services') && url.endsWith('dry-run')) throw error;
    return { status: 'Success' };
  });
  const mutation = store.useCreateStatefulSetMutation();

  await assert.rejects(
    mutation.mutate({
      params: { cluster: 'host', namespace: 'v4-migration-e2e' },
      data: {
        workload: { metadata: { name: 'native-statefulset' } },
        service: { metadata: { name: 'native-statefulset-ab12' } },
      },
    }),
    reason => reason === error,
  );
  assert.deepEqual(calls, [
    'create:statefulsets:host:v4-migration-e2e:native-statefulset:dry-run',
    'create:services:host:v4-migration-e2e:native-statefulset-ab12:dry-run',
  ]);
});

test('StatefulSet 实际 Service 创建失败时不创建 Workload', async () => {
  const error = new Error('Service create failed');
  const calls: string[] = [];
  const store = loadStore('statefulsets', async url => {
    calls.push(url);
    if (url === 'create:services:host:v4-migration-e2e:native-statefulset-ab12:persist') {
      throw error;
    }
    return { status: 'Success' };
  });

  await assert.rejects(
    store.useCreateStatefulSetMutation().mutate({
      params: { cluster: 'host', namespace: 'v4-migration-e2e' },
      data: {
        workload: { metadata: { name: 'native-statefulset' } },
        service: { metadata: { name: 'native-statefulset-ab12' } },
      },
    }),
    reason => reason === error,
  );
  assert.equal(
    calls.includes('create:statefulsets:host:v4-migration-e2e:native-statefulset:persist'),
    false,
  );
});

test('StatefulSet 实际 Workload 创建失败时回收本轮已创建的 Service', async () => {
  const error = new Error('StatefulSet create failed');
  const calls: string[] = [];
  const store = loadStore('statefulsets', async url => {
    calls.push(url);
    if (url === 'create:statefulsets:host:v4-migration-e2e:native-statefulset:persist') {
      throw error;
    }
    return { status: 'Success' };
  });

  await assert.rejects(
    store.useCreateStatefulSetMutation().mutate({
      params: { cluster: 'host', namespace: 'v4-migration-e2e' },
      data: {
        workload: { metadata: { name: 'native-statefulset' } },
        service: { metadata: { name: 'native-statefulset-ab12' } },
      },
    }),
    reason => reason === error,
  );
  assert.deepEqual(calls.slice(-3), [
    'create:services:host:v4-migration-e2e:native-statefulset-ab12:persist',
    'create:statefulsets:host:v4-migration-e2e:native-statefulset:persist',
    'delete:services:host:v4-migration-e2e:native-statefulset-ab12',
  ]);
});

test('native workload create mutation rejects API failures without reporting success', async () => {
  const error = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
  let successes = 0;
  let reportedError: unknown;
  const store = loadStore('deployments', async () => {
    throw error;
  });
  const mutation = store.useCreateWorkloadMutation({
    onSuccess: () => successes++,
    onError: (reason: unknown) => (reportedError = reason),
  });

  await assert.rejects(
    mutation.mutate({
      params: { cluster: 'host', namespace: 'v4-migration-e2e' },
      data: { metadata: { name: 'native-deployment' } },
    }),
    reason => reason === error,
  );
  assert.equal(successes, 0);
  assert.equal(reportedError, error);
  assert.equal(mutation.getCurrentResult().isError, true);
});
