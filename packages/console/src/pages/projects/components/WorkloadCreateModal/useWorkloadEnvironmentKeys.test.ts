import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadHook() {
  const file = path.join(__dirname, 'useWorkloadEnvironmentKeys.ts');
  assert.ok(existsSync(file), '需要按作用域读取引用键名的原生 Hook');
  const queries: any[] = [];
  const calls: string[] = [];
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      require: (name: string) => {
        if (name === 'react-query')
          return {
            useQuery: (...args: any[]) => {
              queries.push(args);
              return {};
            },
          };
        assert.equal(name, '@ks-console/shared');
        return {
          configMapStore: {
            getDetailUrl: ({ cluster, namespace, name }: any) =>
              `${cluster}/${namespace}/configmaps/${name}`,
          },
          secretStore: {
            getDetailUrl: ({ cluster, namespace, name }: any) =>
              `${cluster}/${namespace}/secrets/${name}`,
            fetchDetail: () => assert.fail('不得调用会解码 Secret 的 mapper'),
          },
          request: {
            get: async (url: string) => {
              calls.push(url);
              return { data: { item: 'Zml4dHVyZQ==', other: 'fixture' } };
            },
          },
        };
      },
    },
  );
  return { hook: loaded.exports.default, queries, calls };
}

test('ConfigMap/Secret 只将键名放入查询缓存，按 cluster/namespace/kind/name 隔离', async () => {
  const { hook, queries, calls } = loadHook();
  hook('secret', 'fixture', { cluster: 'host', namespace: 'first' });
  hook('secret', 'fixture', { cluster: 'host', namespace: 'second' });
  hook('configMap', 'settings', { cluster: 'host', namespace: 'second' });
  assert.notDeepEqual(queries[0][0], queries[1][0]);
  assert.notDeepEqual(queries[1][0], queries[2][0]);
  for (const query of queries) {
    assert.equal(query[2].enabled, true);
    assert.deepEqual(Array.from(await query[1]()), ['item', 'other']);
  }
  assert.deepEqual(calls, [
    'host/first/secrets/fixture',
    'host/second/secrets/fixture',
    'host/second/configmaps/settings',
  ]);
});

test('没有完整作用域/资源来源时禁用查询，手动调用 queryFn 也不扩大到集群或其他 namespace', async () => {
  const { hook, queries, calls } = loadHook();
  hook('secret', 'fixture', undefined);
  hook('configMap', 'settings', { cluster: 'host', namespace: '' });
  hook(undefined, '', { cluster: 'host', namespace: 'first' });
  for (const query of queries) {
    assert.equal(query[2].enabled, false);
    assert.deepEqual(Array.from(await query[1]()), []);
  }
  assert.equal(calls.length, 0);
});
