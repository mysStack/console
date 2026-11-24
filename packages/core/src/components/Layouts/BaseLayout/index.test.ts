/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('BaseLayout listens for embed consoleRouteChange', () => {
  const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');
  assert.match(source, /bus\.\$on\('consoleRouteChange'/);
  assert.match(source, /toHostResourceLocation/);
  assert.match(source, /name === 'consoleV3Actions'/);
});
