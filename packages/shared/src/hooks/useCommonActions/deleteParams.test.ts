import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeleteParams } from './deleteParams';

test('批量删除保留关联 Service 和 HPA 所需的 annotations，并应用当前集群作用域', () => {
  const item = {
    cluster: 'other-cluster',
    namespace: 'v4-migration-e2e',
    name: 'workload-test',
    annotations: {
      'kubesphere.io/related-service': 'workload-test-headless',
      'kubesphere.io/relatedHPA': 'workload-test-hpa',
    },
  };

  assert.deepEqual(buildDeleteParams([item], { cluster: 'host' }), [
    {
      namespace: 'v4-migration-e2e',
      name: 'workload-test',
      annotations: item.annotations,
      cluster: 'host',
    },
  ]);
});
