import assert from 'node:assert/strict';
import test from 'node:test';

const params = {
  cluster: 'host',
  namespace: 'v4-migration-e2e',
  name: 'sample',
};

test('builds a stable HPA lookup key from resource identity', async () => {
  globalThis.globals = { config: {} } as any;
  const { getHpaLookupKey } = await import('./hpaLookup');
  const detail = {
    uid: 'uid-1',
    resourceVersion: '10',
  };

  assert.equal(getHpaLookupKey(params, detail), getHpaLookupKey({ ...params }, { ...detail }));
  assert.equal(getHpaLookupKey(params, {}), '');
});

test('checks once and skips the detail request when the HPA is absent', async () => {
  globalThis.globals = { config: {} } as any;
  const { loadHpaDetail } = await import('./hpaLookup');
  let checks = 0;
  let fetches = 0;
  const absent = await loadHpaDetail({
    params,
    detail: { uid: 'uid-1', resourceVersion: '10' },
    k8sVersion: 'v1.28.0',
    checkName: async () => {
      checks += 1;
      return { exist: false };
    },
    fetchDetail: async () => {
      fetches += 1;
      return { name: 'unexpected' };
    },
  });

  assert.equal(absent, null);
  assert.equal(checks, 1);
  assert.equal(fetches, 0);
});

test('uses the supported HPA API path and returns an existing HPA', async () => {
  globalThis.globals = { config: {} } as any;
  const { loadHpaDetail } = await import('./hpaLookup');
  let requestedUrl = '';
  const hpa = await loadHpaDetail({
    params,
    detail: { uid: 'uid-1', resourceVersion: '10' },
    checkName: async (_detail, _options, url) => {
      requestedUrl = url;
      return { exist: true };
    },
    fetchDetail: async () => ({ name: 'sample' }),
  });

  assert.match(requestedUrl, /\/apis\/autoscaling\/v2\/namespaces\//);
  assert.deepEqual(hpa, { name: 'sample' });
});
