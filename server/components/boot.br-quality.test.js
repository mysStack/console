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

test('hashed console entries have immutable public caching only after successful static reads', async () => {
  const vm = require('node:vm');
  const middleware = [];
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    process: { env: { NODE_ENV: 'production' } },
    global: { MODE_DEV: false },
    require(name) {
      if (name === '../libs/utils')
        return {
          getServerConfig: () => ({
            server: { http: { static: { production: { '/dist': 'dist' } } } },
          }),
          cwdResolve: value => value,
          root: value => value,
        };
      if (name === 'koa-compress') return () => async (_ctx, next) => next();
      if (name === 'koa-mount') return () => async (_ctx, next) => next();
      if (name === 'koa-static') return () => null;
      if (name === 'koa-ejs') return () => {};
      return require(name);
    },
  });
  loaded.exports({
    use(fn) {
      middleware.push(fn);
    },
  });
  for (const [pathname, status, expected] of [
    ['/dist/entry/auth.123456abcdef.js', 200, true],
    ['/dist/entry/navigator.123456abcdef.css', 304, true],
    ['/dist/entry/config-reference.123456abcdef.js', 200, true],
    ['/dist/entry/auth.123456abcdef.js', 404, false],
    ['/dist/entry/manifest.json', 200, false],
    ['/dist/entry/auth.js', 200, false],
    ['/dashboard', 200, false],
  ]) {
    const headers = {};
    const ctx = {
      path: pathname,
      status,
      set(name, value) {
        headers[name] = value;
      },
    };
    await middleware[1](ctx, async () => {});
    assert.equal(
      headers['Cache-Control'],
      expected ? 'public, max-age=31536000, immutable' : undefined,
      pathname + ' ' + status,
    );
  }
});
