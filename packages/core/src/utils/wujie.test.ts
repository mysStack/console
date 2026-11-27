/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'wujie.ts'), 'utf8');

test('initWujie no longer dual-preloads dashboard on every boot', () => {
  assert.doesNotMatch(
    source,
    /preloadApp\(\{\s*name: 'consoleV3Actions',[\s\S]*?\/consolev3\/dashboard`[\s\S]*?\}\);\s*preloadApp\(\{\s*name: 'consolev3',\s*url: `\/\/\$\{window\.location\.host\}\/consolev3\/dashboard`/,
  );
});

test('initWujie preloads assets but leaves the first main V3 execution to its visible host', () => {
  assert.match(source, /shouldPreloadConsoleV3|isConsoleV3ProjectListPath/);
  assert.match(source, /preloadConsoleV3MainAssetsForRoute/);
  assert.match(source, /LIST_ACTIONS_PRELOAD_DELAY_MS/);
  assert.doesNotMatch(source, /preloadApp\(\{\s*name: 'consolev3',/);
});
