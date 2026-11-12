const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const zlib = require('node:zlib');
const Koa = require('koa');

const body = Buffer.from('window.extension = "static fixture";\n'.repeat(2000));

function loadRoutes(target) {
  const saved = new Map();
  const next = async (_ctx, proceed) => proceed();
  const stubs = {
    './libs/utils': { getServerConfig: () => ({ server: { apiServer: { url: target } } }) },
    './middlewares/proxy': () => next,
    './middlewares/checkToken': next,
    './middlewares/checkIfExist': next,
    './proxy': {},
    './controllers/api': { handleSampleData: next },
    './controllers/session': Object.fromEntries(
      [
        'handleLogin',
        'handleThirdLogin',
        'handleLogout',
        'handleOAuthLogin',
        'handleLoginConfirm',
      ].map(name => [name, next]),
    ),
    './controllers/view': Object.fromEntries(
      [
        'renderView',
        'renderV3View',
        'renderTerminal',
        'renderLogin',
        'renderLoginConfirm',
        'renderMarkdown',
      ].map(name => [name, next]),
    ),
  };
  const routePath = require.resolve('./routes');
  try {
    for (const [id, exports] of Object.entries(stubs)) {
      const path = require.resolve(id);
      saved.set(path, require.cache[path]);
      require.cache[path] = { id: path, filename: path, loaded: true, exports };
    }
    delete require.cache[routePath];
    return require('./routes');
  } finally {
    delete require.cache[routePath];
    for (const [path, value] of saved) {
      if (value) require.cache[path] = value;
      else delete require.cache[path];
    }
  }
}

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
const get = (port, path, headers = {}) =>
  new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port, path, headers }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
        response.on('error', reject);
      })
      .on('error', reject);
  });

test('pstatic proxy compresses extension scripts without changing upstream HTTP behavior', async t => {
  const urls = [];
  const upstream = http.createServer((req, res) => {
    urls.push(req.url);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader(
      'Cache-Control',
      req.url.includes('no-transform') ? 'public, no-transform' : 'public, max-age=300',
    );
    res.setHeader('ETag', '"fixture-v1"');
    if (req.url.includes('not-modified')) {
      res.statusCode = 304;
      return res.end();
    }
    if (req.url.includes('missing')) res.statusCode = 404;
    if (req.url.includes('range')) {
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes 0-3999/${body.length}`);
      res.setHeader('Content-Length', 4000);
      return res.end(body.subarray(0, 4000));
    }
    const output = req.url.includes('encoded') ? zlib.gzipSync(body) : body;
    if (req.url.includes('encoded')) res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', output.length);
    res.end(output);
  });
  await listen(upstream);
  const app = new Koa();
  app.use(loadRoutes(`http://127.0.0.1:${upstream.address().port}`).routes());
  app.use(ctx => {
    ctx.type = 'text/plain';
    ctx.body = body;
  });
  const proxy = http.createServer(app.callback());
  await listen(proxy);
  t.after(async () => {
    await close(proxy);
    await close(upstream);
  });
  const port = proxy.address().port;

  await t.test(
    'gzip reduces the script and preserves query, cache policy, and a valid validator',
    async () => {
      const r = await get(port, '/pstatic/dist/plugin/index.js?resourceVersion=17', {
        'Accept-Encoding': 'gzip',
      });
      assert.equal(r.status, 200);
      assert.equal(r.headers['content-encoding'], 'gzip');
      assert.match(r.headers.vary, /Accept-Encoding/i);
      assert.equal(r.headers['content-length'], undefined);
      assert.equal(r.headers['cache-control'], 'public, max-age=300');
      assert.equal(r.headers.etag, 'W/"fixture-v1"');
      assert.deepEqual(zlib.gunzipSync(r.body), body);
      assert.ok(r.body.length < body.length / 2);
      assert.equal(urls[0], '/dist/plugin/index.js?resourceVersion=17');
    },
  );

  await t.test('identity responses retain their body and strong validator', async () => {
    const r = await get(port, '/pstatic/identity.js', { 'Accept-Encoding': 'identity' });
    assert.equal(r.headers['content-encoding'], undefined);
    assert.equal(r.headers.etag, '"fixture-v1"');
    assert.deepEqual(r.body, body);
  });

  await t.test('does not transform partial or no-transform responses', async () => {
    const range = await get(port, '/pstatic/range.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(range.status, 206);
    assert.equal(range.headers['content-encoding'], undefined);
    assert.equal(range.headers['content-length'], '4000');
    assert.deepEqual(range.body, body.subarray(0, 4000));
    const unchanged = await get(port, '/pstatic/no-transform.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(unchanged.headers['content-encoding'], undefined);
    assert.deepEqual(unchanged.body, body);
  });

  await t.test('does not double-encode an upstream gzip response', async () => {
    const r = await get(port, '/pstatic/encoded.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(r.headers['content-encoding'], 'gzip');
    assert.equal(r.headers.etag, '"fixture-v1"');
    assert.deepEqual(zlib.gunzipSync(r.body), body);
  });

  await t.test('preserves error and conditional response statuses', async () => {
    const missing = await get(port, '/pstatic/missing.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(missing.status, 404);
    const unchanged = await get(port, '/pstatic/not-modified.js', { 'Accept-Encoding': 'gzip' });
    assert.equal(unchanged.status, 304);
    assert.equal(unchanged.headers['content-encoding'], undefined);
    assert.equal(unchanged.body.length, 0);
  });

  await t.test('does not enable compression on unrelated API or log paths', async () => {
    const r = await get(port, '/api/v1/log?follow=true', { 'Accept-Encoding': 'gzip' });
    assert.equal(r.headers['content-encoding'], undefined);
    assert.deepEqual(r.body, body);
  });
});
