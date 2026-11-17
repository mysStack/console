const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const Koa = require('koa');
const { createExtensionStaticProxy } = require('./middlewares/extensionStaticProxy');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));

test('console-target extension assets use the registry without forwarding session credentials', async t => {
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push({
      url: req.url,
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    res.setHeader('Content-Type', 'text/plain');
    res.end('extension fixture');
  });
  await listen(upstream);
  let registryCalls = 0,
    available = true;
  const handler = createExtensionStaticProxy({
    loadRegistry: async token => {
      assert.ok(token);
      registryCalls++;
      return {
        items: [
          {
            metadata: { labels: { 'kubesphere.io/reverse-proxy-target': 'ks-console' } },
            status: { state: available ? 'Available' : 'Unavailable' },
            spec: {
              matcher: { method: '*', path: '/extensions-static/wiz/*' },
              upstream: { url: `http://127.0.0.1:${upstream.address().port}` },
            },
          },
        ],
      };
    },
  });
  const app = new Koa();
  app.use(handler);
  const server = http.createServer(app.callback());
  await listen(server);
  t.after(async () => {
    await close(server);
    await close(upstream);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Cookie: 'token=fixture-session', Authorization: 'Bearer unrelated-fixture' };
  const response = await fetch(base + '/extensions-static/wiz/main.js?v=17', { headers });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'extension fixture');
  assert.deepEqual(seen, [
    { url: '/extensions-static/wiz/main.js?v=17', authorization: undefined, cookie: undefined },
  ]);
  assert.equal((await fetch(base + '/extensions-static/wiz/style.css', { headers })).status, 200);
  assert.equal(registryCalls, 1);
  assert.equal((await fetch(base + '/extensions-static/wiz/main.js')).status, 401);
  assert.equal(
    (await fetch(base + '/extensions-static/wiz/main.js', { method: 'POST', headers })).status,
    404,
  );
  assert.equal((await fetch(base + '/extensions-static/missing/main.js', { headers })).status, 404);
  available = false;
  assert.equal(
    (
      await fetch(base + '/extensions-static/wiz/main.js', {
        headers: { Cookie: 'token=another-fixture' },
      })
    ).status,
    503,
  );
  assert.equal(seen.length, 2);
});

test('registry failures are retryable and unsupported rewrite directives fail closed', async () => {
  let calls = 0;
  const handler = createExtensionStaticProxy({
    loadRegistry: async () => {
      calls++;
      if (calls === 1) throw Error('private registry detail');
      return {
        items: [
          {
            metadata: { labels: { 'kubesphere.io/reverse-proxy-target': 'ks-console' } },
            status: { state: 'Available' },
            spec: {
              matcher: { method: '*', path: '/extensions-static/wiz/*' },
              upstream: { url: 'http://example.invalid' },
              directives: { rewrite: ['unsupported'] },
            },
          },
        ],
      };
    },
  });
  const context = () => ({
    path: '/extensions-static/wiz/main.js',
    method: 'GET',
    cookies: { get: () => 'fixture' },
    status: 0,
  });
  const first = context();
  await handler(first, () => assert.fail());
  assert.equal(first.status, 502);
  assert.ok(!first.body.includes('private registry detail'));
  const second = context();
  await handler(second, () => assert.fail());
  assert.equal(second.status, 502);
  assert.equal(calls, 2);
});
