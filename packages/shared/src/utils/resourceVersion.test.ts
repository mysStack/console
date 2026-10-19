import assert from 'node:assert/strict';
import test from 'node:test';

import { preserveResourceVersion } from './resourceVersion';

test('preserves the resourceVersion supplied by edited YAML', () => {
  const data = { metadata: { name: 'demo', resourceVersion: 'stale' } };
  const result = preserveResourceVersion(data, {
    _originData: { metadata: { resourceVersion: 'current' } },
  });

  assert.deepEqual(result.metadata, { name: 'demo', resourceVersion: 'stale' });
  assert.deepEqual(data.metadata, { name: 'demo', resourceVersion: 'stale' });
});

test('falls back to the loaded resourceVersion when YAML omits it', () => {
  const result = preserveResourceVersion(
    { metadata: { name: 'demo' } },
    { _originData: { metadata: { resourceVersion: 'current' } } },
  );

  assert.deepEqual(result.metadata, { name: 'demo', resourceVersion: 'current' });
});

test('returns the original data when no resourceVersion is available', () => {
  const data = { metadata: { name: 'demo' } };

  assert.strictEqual(preserveResourceVersion(data), data);
});
