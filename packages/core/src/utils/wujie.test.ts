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

test('initWujie only preloads V3 on project list landings and defers actions', () => {
  assert.match(source, /shouldPreloadConsoleV3|isConsoleV3ProjectListPath/);
  assert.match(source, /resolveConsoleV3PreloadUrl/);
  assert.match(source, /preloadConsoleV3MainAssetsForRoute/);
  assert.match(source, /LIST_ACTIONS_PRELOAD_DELAY_MS/);
  const assetAt = source.indexOf('preloadConsoleV3MainAssetsForRoute(');
  const preloadAppAt = source.indexOf("preloadApp({\n    name: 'consolev3'");
  assert.ok(assetAt >= 0 && preloadAppAt >= 0);
  assert.ok(assetAt < preloadAppAt, 'main asset preload should run before consolev3 preloadApp');
});
