import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('镜像凭据只查询当前命名空间的注册表 Secret 元数据，退出后不更新旧作用域', async () => {
  const calls: any[] = [];
  const updates: any[] = [];
  let effect: () => () => void;
  const loaded = { exports: {} as any };
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, 'useWorkloadResourceOptions.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require: (name: string) => {
      if (name === 'react')
        return {
          useState: (initial: any) => [initial, (next: any) => updates.push(next)],
          useEffect: (fn: any) => {
            effect = fn;
          },
        };
      assert.equal(name, '@ks-console/shared');
      return {
        configMapStore: { fetchNameListByK8s: async () => ['settings'] },
        secretStore: {
          fetchNameListByK8s: async (params: any) => {
            calls.push(params);
            return params.fieldSelector ? ['registry-a'] : ['registry-a', 'app-secret'];
          },
          fetchListByK8s: () => {
            throw new Error('不得读取或解码 Secret 内容');
          },
        },
        pvcStore: { fetchListByK8s: async () => [{ name: 'data' }] },
      };
    },
  });
  loaded.exports.default('host', 'v4-migration-e2e');
  effect!();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { cluster: 'host', namespace: 'v4-migration-e2e' },
    {
      cluster: 'host',
      namespace: 'v4-migration-e2e',
      fieldSelector: 'type=kubernetes.io/dockerconfigjson',
    },
  ]);
  const options = updates.find(value => value?.imagePullSecrets);
  assert.deepEqual(Array.from(options.imagePullSecrets), ['registry-a']);
  assert.deepEqual(Array.from(options.secrets), ['registry-a', 'app-secret']);

  updates.length = 0;
  effect!()();
  const immediateUpdates = updates.length;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates.length, immediateUpdates, '清理后的旧作用域请求不得回写状态');
});

test('切换 cluster/namespace 后立即隐藏旧作用域选项，不能在新数据返回前复用旧 Secret 名称', () => {
  const loaded = { exports: {} as any };
  const previous = {
    configMaps: ['old-map'],
    secrets: ['old-secret'],
    imagePullSecrets: [],
    persistentVolumeClaims: [],
    context: { cluster: 'host', namespace: 'old' },
  };
  let cursor = 0;
  runInNewContext(
    ts.transpileModule(
      readFileSync(path.join(__dirname, 'useWorkloadResourceOptions.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      require: () => ({
        useState: (initial: any) => [cursor++ === 0 ? previous : initial, () => {}],
        useEffect: () => {},
      }),
    },
  );
  const options = loaded.exports.default('host', 'new').options;
  assert.deepEqual(Array.from(options.secrets), []);
  assert.deepEqual(Array.from(options.configMaps), []);
  cursor = 0;
  assert.deepEqual(
    Array.from(loaded.exports.default('another-cluster', 'old').options.secrets),
    [],
  );
  cursor = 0;
  assert.deepEqual(Array.from(loaded.exports.default('host', 'old').options.secrets), [
    'old-secret',
  ]);
});
