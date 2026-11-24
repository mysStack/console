/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const webpackBase = readFileSync(path.join(__dirname, 'webpack.base.conf.js'), 'utf8');
const webpackCli = readFileSync(path.join(__dirname, '../cli/webpack.js'), 'utf8');
const dockerfile = readFileSync(path.join(__dirname, '../../../build/Dockerfile.dapper'), 'utf8');

test('webpack no longer copies sealed v3dist into Console dist', () => {
  assert.match(webpackBase, /ignore:\s*\['\*\*\/v3dist\/\*\*'\]/);
  assert.doesNotMatch(webpackBase, /from:\s*`\$\{config\.assetsPath\}\/v3dist`/);
  assert.doesNotMatch(webpackBase, /to:\s*`\$\{config\.distPath\}\/v3dist`/);
});

test('dev server no longer copies assets/v3dist into dist/v3dist', () => {
  assert.doesNotMatch(webpackCli, /copy consolev3 files/);
  assert.doesNotMatch(webpackCli, /copySync\(srcDir,\s*v3distDir\)/);
});

test('Console image drops dist/v3dist after copy', () => {
  assert.match(dockerfile, /rm -rf dist\/v3dist/);
  const rmAt = dockerfile.indexOf('rm -rf dist/v3dist');
  const userAt = dockerfile.indexOf('USER kubesphere');
  assert.ok(rmAt >= 0 && userAt >= 0 && rmAt < userAt);
});
