import assert from 'node:assert/strict';
import test from 'node:test';

import { getConfigReferenceSummaryRows } from './summary';

test('builds display rows without reading ConfigMap or Secret data', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [
        { configMapRef: { name: 'wes-app' }, prefix: 'APP_' },
        { secretRef: { name: 'wes-secret' } },
      ],
    }),
    [
      { kind: 'configMap', name: 'wes-app', prefix: 'APP_', label: 'ConfigMap' },
      { kind: 'secret', name: 'wes-secret', label: 'Secret' },
    ],
  );
});

test('omits malformed references from the display', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [{ configMapRef: { name: '' } }, { secretRef: { name: 'valid' } }],
    }),
    [{ kind: 'secret', name: 'valid', label: 'Secret' }],
  );
});
