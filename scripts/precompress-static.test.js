const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { createRequire } = require('node:module');
const Koa = require('koa');
const { precompressStatic } = require('./precompress-static');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'console-static-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'js'));
  fs.mkdirSync(path.join(root, 'entry'));
  return root;
}

test('precompression preserves sources and excludes server code, small files and symbolic links', t => {
  const root = fixture(t);
  const body = Buffer.from('window.consoleFixture = "static asset";\n'.repeat(300));
  const asset = path.join(root, 'js/main.12345678.js');
  fs.writeFileSync(asset, body);
  fs.writeFileSync(path.join(root, 'entry/auth.123456abcdef.js'), body);
  fs.writeFileSync(path.join(root, 'server.js'), body);
  fs.writeFileSync(path.join(root, 'js/small.js'), 'small');
  fs.writeFileSync(path.join(root, 'js/main.js.map'), body);
  fs.symlinkSync(path.join(root, 'server.js'), path.join(root, 'js/link.js'));
  const result = precompressStatic(root);
  assert.equal(result.files, 2);
  assert.deepEqual(fs.readFileSync(asset), body);
  assert.deepEqual(zlib.gunzipSync(fs.readFileSync(asset + '.gz')), body);
  assert.deepEqual(zlib.brotliDecompressSync(fs.readFileSync(asset + '.br')), body);
  for (const file of ['server.js', 'js/small.js', 'js/main.js.map', 'js/link.js']) {
    assert.equal(fs.existsSync(path.join(root, file + '.gz')), false, file);
    assert.equal(fs.existsSync(path.join(root, file + '.br')), false, file);
  }
  const updated = Buffer.concat([body, Buffer.from('updated')]);
  fs.writeFileSync(asset, updated);
  precompressStatic(root);
  assert.deepEqual(zlib.gunzipSync(fs.readFileSync(asset + '.gz')), updated);
  assert.deepEqual(zlib.brotliDecompressSync(fs.readFileSync(asset + '.br')), updated);
  assert.ok(Math.abs(fs.statSync(asset).mtimeMs - fs.statSync(asset + '.br').mtimeMs) < 1);
});

test('production boot serves precompressed assets with negotiation, HEAD and conditional caching', async t => {
  const root = fixture(t);
  const name = 'entry/auth.123456abcdef.js';
  const body = Buffer.from('window.consoleFixture = "static asset";\n'.repeat(300));
  fs.writeFileSync(path.join(root, name), body);
  const bootPath = path.resolve(__dirname, '../server/components/boot.js');
  const bootRequire = createRequire(bootPath);
  const loaded = { exports: {} };
  vm.runInNewContext(fs.readFileSync(bootPath, 'utf8'), {
    module: loaded,
    exports: loaded.exports,
    process: { env: { NODE_ENV: 'production' } },
    global: { MODE_DEV: false },
    require(id) {
      if (id === '../libs/utils') {
        return {
          getServerConfig: () => ({
            server: { http: { static: { production: { '/dist': root } } } },
          }),
          cwdResolve: value => value,
          root: value => value,
        };
      }
      if (id === 'koa-ejs') return () => {};
      return bootRequire(id);
    },
  });
  const app = new Koa();
  loaded.exports(app);
  const server = http.createServer(app.callback());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (encoding, method = 'GET', extra = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: server.address().port,
          path: '/dist/' + name,
          method,
          headers: { 'Accept-Encoding': encoding, ...extra },
        },
        res => {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
          );
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.end();
    });
  const baseline = await request('identity');
  const baselineConditional = await request('identity', 'GET', {
    'If-Modified-Since': baseline.headers['last-modified'],
  });
  precompressStatic(root);
  for (const [encoding, suffix] of [
    ['gzip', '.gz'],
    ['br, gzip', '.br'],
    ['br;q=0, gzip', '.gz'],
    ['identity', ''],
  ]) {
    const response = await request(encoding);
    assert.equal(response.status, 200);
    assert.equal(
      response.headers['content-encoding'],
      suffix ? suffix.slice(1).replace('gz', 'gzip') : undefined,
    );
    assert.deepEqual(response.body, fs.readFileSync(path.join(root, name + suffix)));
    assert.equal(Number(response.headers['content-length']), response.body.length);
    assert.match(response.headers['content-type'], /javascript/);
    assert.match(response.headers.vary, /Accept-Encoding/);
    assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
    const head = await request(encoding, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(head.headers['content-length'], response.headers['content-length']);
    assert.equal(head.headers['content-encoding'], response.headers['content-encoding']);
    const cached = await request(encoding, 'GET', {
      'If-Modified-Since': response.headers['last-modified'],
    });
    assert.equal(cached.status, baselineConditional.status);
    assert.equal(cached.headers['last-modified'], baseline.headers['last-modified']);
  }
});
