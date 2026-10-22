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
  send: (url: string) => Promise<unknown> = async () => ({ status: 'Success' }),
) {
  const client = new QueryClient();
  const module = { exports: {} as any };
  const request = { delete: send, patch: send, post: send };
  const dependencies: Record<string, unknown> = {
    'react-query': {
      useMutation: (mutationFn: any, options: any) =>
        new MutationObserver(client, { ...options, mutationFn, retry: false }),
    },
    '../store': () => ({
      getDetailUrl: ({ name }: any) => name,
      post: (params: any, data: any) =>
        send(`create:${params.cluster}:${params.namespace}:${data.metadata.name}`),
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

  assert.deepEqual(calls, ['create:host:v4-migration-e2e:native-deployment']);
  assert.equal(successes, 1);
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
