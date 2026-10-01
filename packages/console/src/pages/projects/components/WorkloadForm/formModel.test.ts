import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmptyWorkloadForm, validateWorkloadForm } from './formModel';

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
