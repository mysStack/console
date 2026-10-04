import assert from 'node:assert/strict';
import test from 'node:test';

import { RELOADER_AUTO_ANNOTATION, readReloaderPolicy, writeReloaderPolicy } from './reloader';

test('reads only the Reloader auto annotation', () => {
  assert.deepEqual(readReloaderPolicy({ [RELOADER_AUTO_ANNOTATION]: 'true' }), { enabled: true });
  assert.deepEqual(readReloaderPolicy({ [RELOADER_AUTO_ANNOTATION]: 'false' }), { enabled: false });
});

test('preserves unrelated annotations when toggling Reloader', () => {
  const annotations = { 'example.com/owner': 'team-a', [RELOADER_AUTO_ANNOTATION]: 'true' };
  assert.deepEqual(writeReloaderPolicy(annotations, false), { 'example.com/owner': 'team-a' });
  assert.deepEqual(writeReloaderPolicy({ 'example.com/owner': 'team-a' }, true), {
    'example.com/owner': 'team-a',
    [RELOADER_AUTO_ANNOTATION]: 'true',
  });
});
