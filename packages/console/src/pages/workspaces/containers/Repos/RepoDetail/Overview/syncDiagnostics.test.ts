import assert from 'node:assert/strict';
import test from 'node:test';

import { getSyncDiagnosticItems } from './syncDiagnostics';

test('returns only populated sync metrics and the sanitized error summary', () => {
  assert.deepEqual(
    getSyncDiagnosticItems({
      durationSeconds: 12,
      validChartVersionCount: 7,
      requestCount: 80,
      lastError: '401 unauthorized',
    }),
    [
      { key: 'durationSeconds', value: 12 },
      { key: 'validChartVersionCount', value: 7 },
      { key: 'requestCount', value: 80 },
      { key: 'lastError', value: '401 unauthorized' },
    ],
  );
});

test('does not invent zero values for an old repository without sync status', () => {
  assert.deepEqual(getSyncDiagnosticItems(undefined), []);
});
