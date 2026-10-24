import assert from 'node:assert/strict';
import test from 'node:test';

test('returns an HPA API path without duplicating the cluster /apis prefix', async () => {
  globalThis.globals = { config: {} } as any;
  const { getHpaApiVersion } = await import('./getApiVersion');

  assert.equal(getHpaApiVersion(), 'autoscaling/v2');
  assert.equal(getHpaApiVersion('v1.28.0'), 'autoscaling/v2');
  assert.equal(getHpaApiVersion('v1.22.0'), 'autoscaling/v2beta2');
});
