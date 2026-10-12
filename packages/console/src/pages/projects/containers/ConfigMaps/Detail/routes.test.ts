/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'routes.tsx'), 'utf8');

test('ConfigMap detail exposes native data/history/metadata/events tabs', () => {
  const paths = Array.from(source.matchAll(/path: '([a-z-]+)'/g)).map(match => match[1]);
  assert.deepEqual(paths, ['detail', 'revision-control', 'metadata', 'events']);
});

test('ConfigMap detail does not route to the injected env page', () => {
  assert.ok(!source.includes("path: 'env'"));
});
