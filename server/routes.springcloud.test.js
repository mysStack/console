const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const Koa = require('koa');

const name = 'configurations.springcloud.kubesphere.io';
const legacy = `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/customresourcedefinitions?name=${name}`;
const named = `/clusters/host/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${name}`;
const crd = {
  apiVersion: 'apiextensions.k8s.io/v1',
  kind: 'CustomResourceDefinition',
  metadata: { name, resourceVersion: '7' },
  spec: {
    group: 'springcloud.kubesphere.io',
    names: { kind: 'Configuration', plural: 'configurations', singular: 'configuration' },
    scope: 'Namespaced',
    versions: [
      {
        name: 'v1alpha1',
        served: true,
        storage: true,
        schema: { openAPIV3Schema: { type: 'object' } },
      },
    ],
  },
  status: { conditions: [{ type: 'Established', status: 'True' }], storedVersions: ['v1alpha1'] },
};
const missing = {
  apiVersion: 'v1',
  kind: 'Status',
  status: 'Failure',
  reason: 'NotFound',
  code: 404,
  details: { group: 'apiextensions.k8s.io', kind: 'customresourcedefinitions', name },
};
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));

function loadRoutes(target, agent) {
  global.SERVER_ROOT = __dirname;
  global.APP_ROOT = path.resolve(__dirname, '..');
  global.MODE_DEV = false;
  const utils = require('./libs/utils');
  const original = utils.getServerConfig;
  utils.getServerConfig = () => {
    const config = original();
    return {
      ...config,
      server: { ...config.server, apiServer: { ...config.server.apiServer, url: target } },
      target,
      agent,
    };
  };
  try {
    return require('./routes');
  } finally {
    utils.getServerConfig = original;
  }
}

function request(
  port,
  url,
  { method = 'GET', authenticated = true, refreshed = true, headers = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: url,
        method,
        headers: {
          ...(authenticated
            ? {
                cookie: 'token=fixture-old-token',
                ...(refreshed ? { 'x-fixture-refreshed-token': 'fixture-current-token' } : {}),
              }
            : {}),
          ...headers,
        },
      },
      res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('legacy SpringCloud capability queries use a precise CRD lookup without changing list semantics', async t => {
  let mode = 'absent';
  let legacyStatus = 200;
  let calls = [];
  const upstream = http.createServer((req, res) => {
    calls.push({ url: req.url, method: req.method, authorization: req.headers.authorization });
    res.setHeader('content-type', 'application/json');
    if (req.url.includes('/apis/apiextensions.k8s.io/v1/customresourcedefinitions/')) {
      if (mode === 'drop') return req.socket.destroy();
      if (mode === 'hang') return;
      if (mode === 'present') return res.end(JSON.stringify(crd));
      if (mode === 'malformed')
        return res.end(JSON.stringify({ kind: 'Status', status: 'Success' }));
      const status = mode === 'forbidden' ? 403 : mode === 'error' ? 500 : 404;
      res.statusCode = status;
      return res.end(
        JSON.stringify(
          mode === 'absent'
            ? missing
            : {
                ...missing,
                code: status,
                reason:
                  mode === 'forbidden'
                    ? 'Forbidden'
                    : mode === 'error'
                      ? 'InternalError'
                      : 'NotFound',
                details: {},
              },
        ),
      );
    }
    res.statusCode = legacyStatus;
    res.end(
      JSON.stringify(
        legacyStatus === 200
          ? {
              items: mode === 'present' || mode === 'forbidden' ? [crd] : [],
              totalItems: mode === 'present' || mode === 'forbidden' ? 1 : 0,
            }
          : { code: legacyStatus, reason: 'ServiceUnavailable', message: 'fixture legacy failure' },
      ),
    );
  });
  await listen(upstream);
  const agent = new http.Agent();
  const app = new Koa();
  // Exercise the refreshed-token contract without needing real OAuth credentials.
  app.use((ctx, next) => {
    ctx.req.token = ctx.headers['x-fixture-refreshed-token'];
    return next();
  });
  app.use(loadRoutes(`http://127.0.0.1:${upstream.address().port}`, agent).routes());
  const server = http.createServer(app.callback());
  await listen(server);
  t.after(async () => {
    agent.destroy();
    await close(server);
    await close(upstream);
  });
  const port = server.address().port;

  await t.test(
    'a confirmed absent CRD returns an empty legacy list without the expensive list request',
    async () => {
      calls = [];
      mode = 'absent';
      const result = await request(port, legacy);
      assert.deepEqual(result, { status: 200, body: { items: [], totalItems: 0 } });
      assert.deepEqual(calls, [
        { url: named, method: 'GET', authorization: 'Bearer fixture-current-token' },
      ]);
    },
  );

  await t.test('an installed CRD retains the legacy list payload and is fetched anew', async () => {
    calls = [];
    mode = 'present';
    const result = await request(port, legacy);
    assert.deepEqual(result, { status: 200, body: { items: [crd], totalItems: 1 } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, named);
  });

  await t.test(
    'direct-get permission differences fall back to the authorized legacy list',
    async () => {
      calls = [];
      mode = 'forbidden';
      const result = await request(port, legacy);
      assert.equal(result.status, 200);
      assert.equal(result.body.totalItems, 1);
      assert.deepEqual(
        calls.map(x => x.url),
        [named, legacy],
      );
      assert.ok(calls.every(x => x.authorization === 'Bearer fixture-current-token'));
    },
  );

  for (const failure of ['unknown404', 'malformed', 'drop']) {
    await t.test(`${failure} is not mistaken for an uninstalled component`, async () => {
      calls = [];
      mode = failure;
      const result = await request(port, legacy);
      assert.equal(result.status, 200);
      assert.deepEqual(
        calls.map(x => x.url),
        [named, legacy],
      );
    });
  }

  await t.test('a failed direct request preserves a legacy error status and body', async () => {
    calls = [];
    mode = 'error';
    legacyStatus = 503;
    try {
      const result = await request(port, legacy);
      assert.deepEqual(result, {
        status: 503,
        body: { code: 503, reason: 'ServiceUnavailable', message: 'fixture legacy failure' },
      });
      assert.deepEqual(
        calls.map(x => x.url),
        [named, legacy],
      );
    } finally {
      legacyStatus = 200;
    }
  });

  await t.test(
    'a slow direct endpoint falls back rather than holding the legacy query indefinitely',
    { timeout: 4000 },
    async () => {
      calls = [];
      mode = 'hang';
      const result = await request(port, legacy);
      assert.equal(result.status, 200);
      assert.deepEqual(
        calls.map(x => x.url),
        [named, legacy],
      );
    },
  );

  await t.test(
    'ordinary cookie authentication is retained when no token was refreshed',
    async () => {
      calls = [];
      mode = 'absent';
      const result = await request(port, legacy, { refreshed: false });
      assert.equal(result.body.totalItems, 0);
      assert.deepEqual(calls, [
        { url: named, method: 'GET', authorization: 'Bearer fixture-old-token' },
      ]);
    },
  );

  await t.test('an unprefixed host request keeps its backend scope', async () => {
    calls = [];
    mode = 'absent';
    await request(port, legacy.replace('/clusters/host', ''));
    assert.equal(calls[0].url, named.replace('/clusters/host', ''));
  });

  await t.test('a member cluster lookup is not redirected to the host', async () => {
    calls = [];
    mode = 'absent';
    await request(port, legacy.replace('/clusters/host', '/clusters/member-a'));
    assert.equal(calls[0].url, named.replace('/clusters/host', '/clusters/member-a'));
  });

  const bypass = [
    { url: legacy.replace(`name=${name}`, 'name=other.example.io') },
    { url: legacy + '&limit=10' },
    { url: legacy + `&name=${name}` },
    { url: legacy, method: 'POST' },
    { url: legacy, method: 'HEAD' },
    { url: legacy, authenticated: false },
    { url: legacy, headers: { 'x-check-exist': 'true' } },
  ];
  for (const input of bypass) {
    await t.test(`unrelated request is unchanged: ${JSON.stringify(input)}`, async () => {
      calls = [];
      mode = 'absent';
      await request(port, input.url, input);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, input.url);
      assert.equal(calls[0].method, input.method || 'GET');
    });
  }
});
