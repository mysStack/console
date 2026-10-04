import assert from 'node:assert/strict';
import test from 'node:test';

import { getConfigReferencePath } from './entry';

test('builds a project workload config-reference path', () => {
  assert.equal(
    getConfigReferencePath({
      workspace: 'dev-workspace',
      cluster: 'host',
      namespace: 'dev-wes',
      module: 'deployments',
      name: 'wes-v2-server',
    }),
    '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server/config-reference',
  );
});
