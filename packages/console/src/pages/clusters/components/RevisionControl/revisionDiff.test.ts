import assert from 'node:assert';
import test from 'node:test';
import { createPatch } from 'diff';
import { parse } from 'diff2html';

import { EMPTY_REVISION_YAML } from './revisionDiff';

test('empty revision baseline produces a diff2html-compatible patch', () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);

  try {
    const patch = createPatch(
      'yaml',
      EMPTY_REVISION_YAML,
      'apiVersion: apps/v1\nkind: Deployment\n',
      '',
      '',
      { context: -1 },
    );

    assert.equal(parse(patch).length, 1);
    assert.deepEqual(errors, []);
  } finally {
    console.error = originalError;
  }
});
