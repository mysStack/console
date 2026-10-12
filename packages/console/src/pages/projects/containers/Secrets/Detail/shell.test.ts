/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Secret detail shell uses the native DetailPage container', () => {
  assert.match(source, /DetailPage/);
});

test('Secret detail shell drops the Wujie injection', () => {
  assert.doesNotMatch(source, /WujieReact|useConfigHistoryEntry|wujie-react/);
});
