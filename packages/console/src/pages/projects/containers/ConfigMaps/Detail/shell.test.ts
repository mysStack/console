/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConfigMap detail shell uses the native DetailPage container', () => {
  assert.match(source, /DetailPage/);
});

test('ConfigMap detail shell drops the Wujie injection', () => {
  assert.doesNotMatch(source, /WujieReact|useConfigHistoryEntry|wujie-react/);
});

test('ConfigMap detail keeps the originating list when returning from a pushed route', () => {
  assert.match(source, /onBack: handleBack/);
  assert.match(source, /navigationType === 'PUSH'/);
  assert.match(source, /location\.pathname\.endsWith\('\/detail'\)/);
});
