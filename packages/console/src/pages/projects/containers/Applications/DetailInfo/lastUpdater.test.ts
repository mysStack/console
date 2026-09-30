import assert from 'node:assert/strict';
import test from 'node:test';

import { getLastUpdater } from './lastUpdater';

test('reads the ApplicationRelease last-updater annotation', () => {
  assert.equal(
    getLastUpdater({
      metadata: { annotations: { 'kubesphere.io/last-updater': 'alice' } },
    }),
    'alice',
  );
});

test('returns an empty value when an ApplicationRelease has no last updater', () => {
  assert.equal(getLastUpdater({ metadata: { annotations: {} } }), '');
  assert.equal(getLastUpdater(undefined), '');
});
