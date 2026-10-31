/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, 'boot.js'), 'utf8');

test('koa-compress brotli uses params quality 4, not bare br:true', () => {
  assert.match(source, /BROTLI_PARAM_QUALITY\]:\s*4/);
  assert.match(source, /br:\s*\{[\s\S]*?params:/);
  assert.doesNotMatch(source, /^\s*br:\s*true\s*,?\s*$/m);
});
