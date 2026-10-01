import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyWorkloadForm,
  getWorkloadFormIdentity,
  patchEnvVariable,
  validateWorkloadForm,
} from './formModel';

test('creates the minimum empty values for each native workload kind', () => {
  assert.deepEqual(createEmptyWorkloadForm('deployments'), {
    name: '',
    image: '',
    env: [],
    envFrom: [],
    resource: undefined,
  });
  assert.equal(createEmptyWorkloadForm('statefulsets').serviceName, '');
  assert.equal('serviceName' in createEmptyWorkloadForm('daemonsets'), false);
});

test('normalizes an env row to avoid value and valueFrom being submitted together', () => {
  assert.deepEqual(
    patchEnvVariable(
      { name: 'POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
      { value: 'demo' },
    ),
    { name: 'POD_NAME', value: 'demo' },
  );
  assert.deepEqual(
    patchEnvVariable(
      { name: 'POD_NAME', value: 'demo' },
      { valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
    ),
    { name: 'POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
  );
});

test('uses name and resourceVersion as the stable edit form initialization identity', () => {
  const first = { ...createEmptyWorkloadForm('deployments'), name: 'demo', resourceVersion: '42' };
  const refetched = { ...first, image: 'server-refetch' };
  assert.equal(getWorkloadFormIdentity(first), 'demo:42');
  assert.equal(getWorkloadFormIdentity(refetched), getWorkloadFormIdentity(first));
  assert.notEqual(
    getWorkloadFormIdentity({ ...refetched, resourceVersion: '43' }),
    getWorkloadFormIdentity(first),
  );
});

test('requires a name and image while allowing env and envFrom together', () => {
  const values = {
    ...createEmptyWorkloadForm('deployments'),
    name: 'demo',
    image: 'nginx:1.27',
    env: [{ name: 'MODE', value: 'prod' }],
    envFrom: [{ type: 'secret' as const, name: 'db', prefix: '' }],
  };
  assert.deepEqual(validateWorkloadForm(values), {});
  assert.deepEqual(validateWorkloadForm(createEmptyWorkloadForm('deployments')), {
    name: '名称不能为空',
    image: '镜像不能为空',
  });
});

test('rejects duplicate ConfigMap or Secret envFrom references before submit', () => {
  assert.deepEqual(
    validateWorkloadForm({
      name: 'demo',
      image: 'nginx:1.27',
      env: [],
      envFrom: [
        { type: 'configMap', name: 'app-config', prefix: '' },
        { type: 'configMap', name: 'app-config', prefix: 'APP_' },
      ],
    }),
    { envFrom: '配置/密钥引用不能重复' },
  );
});

test('rejects incomplete envFrom rows instead of silently dropping them', () => {
  assert.deepEqual(
    validateWorkloadForm({
      name: 'demo',
      image: 'nginx:1.27',
      env: [],
      envFrom: [{ type: 'secret', name: '', prefix: '' }],
    }),
    { envFrom: '配置/密钥引用必须选择资源' },
  );
});

test('rejects environment rows without a variable name', () => {
  assert.deepEqual(
    validateWorkloadForm({
      name: 'demo',
      image: 'nginx:1.27',
      env: [{ name: '', value: 'prod' }],
      envFrom: [],
    }),
    { env: '环境变量名称不能为空' },
  );
});
