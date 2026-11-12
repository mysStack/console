const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const Koa = require('koa');
const proxy = require('./middlewares/proxy');

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));

function loadResourceProxy(target, agent) {
  const utilsPath = require.resolve('./libs/utils');
  const proxyPath = require.resolve('./proxy');
  const saved = require.cache[utilsPath];
  try {
    require.cache[utilsPath] = {
      id: utilsPath,
      filename: utilsPath,
      loaded: true,
      exports: {
        getServerConfig: () => ({ server: { apiServer: { url: target } }, target, agent }),
      },
    };
    delete require.cache[proxyPath];
    return require('./proxy').k8sResourceProxy;
  } finally {
    delete require.cache[proxyPath];
    if (saved) require.cache[utilsPath] = saved;
    else delete require.cache[utilsPath];
  }
}

function get(port, agent, token, path = '/kapis/fixture?limit=10') {
  return new Promise((resolve, reject) => {
    http
      .get(
        {
          host: '127.0.0.1',
          port,
          path,
          agent,
          headers: {
            cookie: `token=${token}`,
            referer: 'http://console.test/project',
            'x-fixture-token': token,
          },
        },
        response => {
          const socket = response.socket;
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () =>
            resolve({
              status: response.statusCode,
              connection: response.headers.connection,
              body: JSON.parse(Buffer.concat(chunks).toString()),
              socket,
            }),
          );
          response.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

test('resource proxy keeps the browser connection open across authenticated API requests', async t => {
  const upstreamAgent = new http.Agent();
  const browserAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const received = [];
  const upstream = http.createServer((req, res) => {
    received.push({
      url: req.url,
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      referer: req.headers.referer,
    });
    res.setHeader('content-type', 'application/json');
    res.statusCode = req.url.includes('forbidden') ? 403 : 200;
    res.end(JSON.stringify({ authorization: req.headers.authorization }));
  });
  await listen(upstream);
  const app = new Koa();
  app.use((ctx, next) => {
    ctx.cookies.get = () => ctx.headers['x-fixture-token'];
    return next();
  });
  app.use(
    proxy(
      '/kapis/(.*)',
      loadResourceProxy(`http://127.0.0.1:${upstream.address().port}`, upstreamAgent),
    ),
  );
  const server = http.createServer(app.callback());
  await listen(server);
  t.after(async () => {
    browserAgent.destroy();
    upstreamAgent.destroy();
    await close(server);
    await close(upstream);
  });

  const first = await get(server.address().port, browserAgent, 'fixture-user-a');
  const second = await get(server.address().port, browserAgent, 'fixture-user-b');
  const forbidden = await get(
    server.address().port,
    browserAgent,
    'fixture-user-a',
    '/kapis/forbidden',
  );

  assert.equal(
    first.connection,
    'keep-alive',
    'API responses must not force a fresh browser TCP connection',
  );
  assert.equal(second.socket, first.socket);
  assert.equal(forbidden.socket, first.socket);
  assert.deepEqual([first.status, second.status, forbidden.status], [200, 200, 403]);
  assert.deepEqual(
    [first.body.authorization, second.body.authorization, forbidden.body.authorization],
    ['Bearer fixture-user-a', 'Bearer fixture-user-b', 'Bearer fixture-user-a'],
  );
  assert.deepEqual(
    received.map(x => x.url),
    ['/kapis/fixture?limit=10', '/kapis/fixture?limit=10', '/kapis/forbidden'],
  );
  assert.ok(received.every(x => x.cookie === undefined && x.referer === undefined));
});
