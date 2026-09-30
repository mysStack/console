import { strict as assert } from 'node:assert';
import test from 'node:test';

import { getConsoleV3ProjectUrl } from './v3Url';

test('builds a V3 project URL below the consolev3 mount path', () => {
  assert.equal(
    getConsoleV3ProjectUrl('dev-workspace', 'host', 'dev-wes'),
    '/consolev3/dev-workspace/clusters/host/projects/dev-wes',
  );
});
