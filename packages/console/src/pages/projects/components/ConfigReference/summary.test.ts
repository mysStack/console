import assert from 'node:assert/strict';
import test from 'node:test';

import { getConfigReferenceSummaryPrefix, getConfigReferenceSummaryRows } from './summary';

test('does not reserve a visible prefix column when no prefix is configured', () => {
  assert.equal(getConfigReferenceSummaryPrefix({ kind: 'secret', name: 'wes-secret' }), undefined);
  assert.equal(
    getConfigReferenceSummaryPrefix({ kind: 'configMap', name: 'wes-app', prefix: 'APP_' }),
    'APP_',
  );
});

test('builds display rows without reading ConfigMap or Secret data', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [
        { configMapRef: { name: 'wes-app' }, prefix: 'APP_' },
        { secretRef: { name: 'wes-secret' } },
      ],
    }),
    [
      { kind: 'configMap', name: 'wes-app', prefix: 'APP_', label: '来自配置字典' },
      { kind: 'secret', name: 'wes-secret', label: '来自保密字典' },
    ],
  );
});

test('omits malformed references from the display', () => {
  assert.deepEqual(
    getConfigReferenceSummaryRows({
      envFrom: [{ configMapRef: { name: '' } }, { secretRef: { name: 'valid' } }],
    }),
    [{ kind: 'secret', name: 'valid', label: '来自保密字典' }],
  );
});
