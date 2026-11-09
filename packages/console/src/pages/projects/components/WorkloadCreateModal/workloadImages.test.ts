import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadApi(response: any = {}, failure?: any) {
  const file = path.join(__dirname, 'workloadImages.ts');
  assert.ok(existsSync(file), '原生镜像选择需要当前制品对应的 API 实现');
  const calls: any[] = [];
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      atob: (value: string) => Buffer.from(value, 'base64').toString('utf8'),
      require: (name: string) => {
        assert.equal(name, '@ks-console/shared');
        return {
          request: {
            get: async (...args: any[]) => {
              calls.push(args);
              if (failure) throw failure;
              return response;
            },
          },
        };
      },
    },
  );
  return { api: loaded.exports, calls };
}
const scope = { cluster: 'host', namespace: 'v4-migration-e2e' };

test('镜像搜索使用当前 V3 namespaced images API，仅传 Secret 名称和查询词', async () => {
  const { api, calls } = loadApi({ entries: ['nginx', 'library/nginx'] });
  assert.deepEqual(Array.from(await api.searchImages(scope, 'registry-a', ' nginx ')), [
    'nginx',
    'library/nginx',
  ]);
  assert.equal(
    calls[0][0],
    'clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/images',
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].params)), {
    secret: 'registry-a',
    q: 'nginx',
  });
  assert.equal(calls[0][1].timeout, 15000);
});

test('没有完整作用域或搜索词时不请求，也不回退至 default 或集群级 API', async () => {
  const { api, calls } = loadApi();
  assert.deepEqual(Array.from(await api.searchImages(scope, '', ' ')), []);
  await assert.rejects(() => api.searchImages({ ...scope, namespace: '' }, '', 'nginx'));
  await assert.rejects(() => api.fetchImageTags(undefined, '', 'nginx', 1));
  assert.equal(calls.length, 0);
});

test('标签分页与显式忽略证书分开传递，不默认降低 TLS 验证', async () => {
  const { api, calls } = loadApi({ tags: ['v1', 'v2'], total: 25 });
  const result = await api.fetchImageTags(scope, 'registry-a', 'registry.example:5000/team/app', 2);
  assert.equal(result.total, 25);
  assert.deepEqual(Array.from(result.tags), ['v1', 'v2']);
  assert.ok(calls[0][0].endsWith('/repositorytags'));
  assert.equal(calls[0][1].params.page, 2);
  assert.equal(calls[0][1].params.limit, 10);
  assert.equal(calls[0][1].params.insecure, undefined);
  await api.fetchImageTags(scope, '', 'nginx', 1, true);
  assert.equal(calls[1][1].params.insecure, true);
});

test('镜像详情只投影可展示元数据，不把 config.Env 等数据留在查询缓存', async () => {
  const { api, calls } = loadApi({
    status: 'succeeded',
    created: '2026-10-24',
    registry: 'docker.io',
    config: { ExposedPorts: { '80/tcp': {} }, Env: ['TEST_ONLY=fixture'] },
    imageManifest: { layers: [{ size: 10 }, { size: 20 }] },
  });
  const result = await api.fetchImageDetail(scope, '', 'nginx:alpine');
  assert.ok(calls[0][0].endsWith('/imageconfig'));
  assert.equal(calls[0][1].params.image, 'nginx:alpine');
  assert.equal(result.created, '2026-10-24');
  assert.equal(result.size, 30);
  assert.equal(result.layers, 2);
  assert.deepEqual(Array.from(result.ports), ['80/tcp']);
  assert.equal(result.config, undefined);
});

test('HTTP 和业务失败均拒绝，证书错误可分类且不回显服务器原始内容', async () => {
  for (const failure of [
    undefined,
    { response: { status: 400, data: { message: 'x509: fixture' } } },
  ]) {
    const { api } = loadApi({ status: 'failed', message: 'x509: fixture' }, failure);
    await assert.rejects(
      () => api.fetchImageDetail(scope, '', 'nginx'),
      (error: any) => {
        assert.equal(error.certificate, true);
        assert.equal(error.message.includes('fixture'), false);
        return true;
      },
    );
  }
});

test('只读取选中仓库 Secret 的主机名，返回值不包含认证字段', async () => {
  const { api, calls } = loadApi({
    data: {
      '.dockerconfigjson': Buffer.from(
        JSON.stringify({
          auths: { 'https://registry.example:5000/v1/': { auth: 'test-only-placeholder' } },
        }),
      ).toString('base64'),
    },
  });
  assert.equal(await api.fetchRegistryHost(scope, 'registry-a'), 'registry.example:5000');
  assert.equal(calls[0][0], 'clusters/host/api/v1/namespaces/v4-migration-e2e/secrets/registry-a');
  assert.equal(await api.fetchRegistryHost(scope, ''), '');
  assert.equal(calls.length, 1);
});

test('镜像解析保留 registry 端口和 digest，标签选择不重复前缀', () => {
  const { api } = loadApi();
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.splitImageReference('registry.example:5000/team/app:v2'))),
    {
      repository: 'registry.example:5000/team/app',
      tag: 'v2',
    },
  );
  assert.equal(api.splitImageReference('registry.example:5000/team/app').tag, 'latest');
  assert.equal(api.splitImageReference('nginx@sha256:abc').repository, 'nginx');
  assert.equal(api.splitImageReference('nginx@sha256:abc').tag, '');
  assert.equal(
    api.registryImage('registry.example:5000', 'team/app'),
    'registry.example:5000/team/app',
  );
  assert.equal(
    api.registryImage('registry.example:5000', 'registry.example:5000/team/app'),
    'registry.example:5000/team/app',
  );
});

test('仓库配置损坏或没有 auths 时明确失败，不让镜像选择静默禁用', async () => {
  for (const response of [{ data: { '.dockerconfigjson': 'invalid-fixture' } }, { data: {} }]) {
    const { api } = loadApi(response);
    await assert.rejects(() => api.fetchRegistryHost(scope, 'registry-a'));
  }
});
