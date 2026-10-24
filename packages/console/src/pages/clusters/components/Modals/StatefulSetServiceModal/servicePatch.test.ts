import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStatefulSetServicePatch } from './servicePatch';

test('StatefulSet Headless Service 写入 None 并保留选择器、端口和资源版本', () => {
  const form = {
    metadata: { name: 'web-headless', resourceVersion: '7' },
    spec: {
      clusterIP: 'headlessSelector',
      selector: { app: 'web' },
      ports: [{ name: 'http', port: 80 }],
    },
  };
  const result = buildStatefulSetServicePatch(form, '8');
  assert.deepEqual(result.spec, {
    clusterIP: 'None',
    selector: { app: 'web' },
    ports: [{ name: 'http', port: 80 }],
  });
  assert.equal(result.metadata.resourceVersion, '8');
  assert.equal(form.spec.clusterIP, 'headlessSelector');
  assert.equal(form.metadata.resourceVersion, '7');
});

test('StatefulSet VirtualIP Service 清除表单占位类型并保留其他字段', () => {
  const result = buildStatefulSetServicePatch(
    {
      metadata: { name: 'web', resourceVersion: '7' },
      spec: { clusterIP: 'virtualIP', selector: { app: 'web' }, ports: [] },
    },
    '9',
  );
  assert.equal('clusterIP' in result.spec, false);
  assert.deepEqual(result.spec.selector, { app: 'web' });
  assert.equal(result.metadata.resourceVersion, '9');
});
