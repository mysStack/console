import assert from 'node:assert/strict';
import test from 'node:test';

import { toNameOptions } from './resourceOptions';

test('normalizes Kubernetes metadata lists and name arrays for resource selectors', () => {
  assert.deepEqual(
    toNameOptions({
      items: [{ metadata: { name: 'wes-app' } }, { metadata: { name: 'wes-job' } }],
    }),
    [
      { label: 'wes-app', value: 'wes-app' },
      { label: 'wes-job', value: 'wes-job' },
    ],
  );
  assert.deepEqual(toNameOptions(['wes-secret']), [{ label: 'wes-secret', value: 'wes-secret' }]);
});
