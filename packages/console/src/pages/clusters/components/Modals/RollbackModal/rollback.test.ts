import assert from 'node:assert/strict';
import test from 'node:test';
import { getRollbackData } from './rollback';

const template = {
  metadata: { labels: { app: 'demo' } },
  spec: { containers: [{ name: 'app', image: 'busybox:1.35' }] },
};

test('builds a strategic merge rollback patch from a controller revision', () => {
  assert.deepEqual(getRollbackData('statefulsets', { revision: 1, spec: { template } }, {}), {
    spec: {
      template: {
        $patch: 'replace',
        ...template,
      },
    },
  });
});

test('supports controller revision payloads retained under _originData.data', () => {
  assert.deepEqual(
    getRollbackData(
      'daemonsets',
      { revision: 1, _originData: { data: { spec: { template } } } },
      {},
    ),
    {
      spec: {
        template: {
          $patch: 'replace',
          ...template,
        },
      },
    },
  );
});

test('matches selected revisions by numeric value and does not build an empty patch', () => {
  assert.deepEqual(
    getRollbackData(
      'statefulsets',
      [{ revision: 1, spec: { template } }].find(item => Number(item.revision) === Number('1')),
      {},
    ),
    {
      spec: {
        template: {
          $patch: 'replace',
          ...template,
        },
      },
    },
  );
  assert.equal(getRollbackData('statefulsets', undefined, {}), undefined);
});

test('builds a JSON patch for deployments and preserves current annotations', () => {
  const annotations = { 'deployment.kubernetes.io/revision': '2' };
  assert.deepEqual(getRollbackData('deployments', { spec: { template } }, annotations), [
    { op: 'replace', path: '/spec/template', value: template },
    { op: 'replace', path: '/metadata/annotations', value: annotations },
  ]);
});
