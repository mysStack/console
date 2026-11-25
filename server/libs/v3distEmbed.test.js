const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const modulePath = require.resolve('./v3distEmbed');

function loadEmbed() {
  delete require.cache[modulePath];
  return require('./v3distEmbed');
}

test('boot.js uses the upstream-aware legacy asset redirect', () => {
  const source = fs.readFileSync(require.resolve('../components/boot.js'), 'utf8');
  assert.match(source, /shouldRedirectLegacyV3Asset/);
  assert.match(source, /getV3DistUpstream/);
  assert.doesNotMatch(source, /fs\.pathExistsSync\(path\.join\('dist', 'v3dist', ctx\.url\)\) &&/);
});

test('redirects legacy /assets images to Embed when upstream is set', () => {
  const { shouldRedirectLegacyV3Asset } = loadEmbed();
  assert.equal(shouldRedirectLegacyV3Asset('/assets/500.svg', { hasUpstream: true }), true);
  assert.equal(shouldRedirectLegacyV3Asset('/assets/500.svg?cache=1', { hasUpstream: true }), true);
  assert.equal(
    shouldRedirectLegacyV3Asset('/assets/500.svg', {
      distExists: true,
      hasUpstream: true,
    }),
    false,
  );
  assert.equal(shouldRedirectLegacyV3Asset('/assets/500.svg', { localV3Exists: true }), true);
  assert.equal(shouldRedirectLegacyV3Asset('/assets/500.svg', {}), false);
  assert.equal(shouldRedirectLegacyV3Asset('/login', { hasUpstream: true }), false);
});

test('getV3DistUpstream reads V3DIST_UPSTREAM and strips a trailing slash', () => {
  const prev = process.env.V3DIST_UPSTREAM;
  process.env.V3DIST_UPSTREAM = 'http://ks-console-embed.kubesphere-system.svc/';
  try {
    const { getV3DistUpstream } = loadEmbed();
    assert.equal(getV3DistUpstream(), 'http://ks-console-embed.kubesphere-system.svc');
  } finally {
    if (prev === undefined) delete process.env.V3DIST_UPSTREAM;
    else process.env.V3DIST_UPSTREAM = prev;
  }
});

test('loadV3DistJson reads local dist/v3dist when upstream is unset', async () => {
  const prevEnv = process.env.V3DIST_UPSTREAM;
  const prevCwd = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v3dist-local-'));
  fs.mkdirSync(path.join(dir, 'dist', 'v3dist'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'dist', 'v3dist', 'manifest.json'),
    JSON.stringify({ entrypoints: { main: { js: ['local.js'] } } }),
  );
  delete process.env.V3DIST_UPSTREAM;
  process.chdir(dir);
  try {
    const { loadV3DistJson } = loadEmbed();
    const data = await loadV3DistJson('manifest.json');
    assert.equal(data.entrypoints.main.js[0], 'local.js');
  } finally {
    process.chdir(prevCwd);
    if (prevEnv === undefined) delete process.env.V3DIST_UPSTREAM;
    else process.env.V3DIST_UPSTREAM = prevEnv;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadV3DistJson fetches from the embed upstream when V3DIST_UPSTREAM is set', async () => {
  const prevEnv = process.env.V3DIST_UPSTREAM;
  const server = http.createServer((req, res) => {
    if (req.url === '/dist/v3dist/manifest.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ entrypoints: { main: { js: ['embed.js'] } } }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  process.env.V3DIST_UPSTREAM = `http://127.0.0.1:${port}`;
  try {
    const { loadV3DistJson } = loadEmbed();
    const data = await loadV3DistJson('manifest.json');
    assert.equal(data.entrypoints.main.js[0], 'embed.js');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (prevEnv === undefined) delete process.env.V3DIST_UPSTREAM;
    else process.env.V3DIST_UPSTREAM = prevEnv;
  }
});

test('applyV3DistProxy no-ops without upstream and installs /dist/v3dist when set', () => {
  const prev = process.env.V3DIST_UPSTREAM;
  const used = [];
  const app = { use: mw => used.push(mw) };
  const calls = [];
  const fakeProxy = (context, options) => {
    calls.push({ context, options });
    return 'v3dist-mw';
  };
  try {
    delete process.env.V3DIST_UPSTREAM;
    const { applyV3DistProxy } = loadEmbed();
    assert.equal(applyV3DistProxy(app, fakeProxy), false);
    assert.deepEqual(used, []);

    process.env.V3DIST_UPSTREAM = 'http://ks-console-embed.kubesphere-system.svc';
    assert.equal(applyV3DistProxy(app, fakeProxy), true);
    assert.deepEqual(used, ['v3dist-mw']);
    assert.equal(calls[0].context, '/dist/v3dist/(.*)');
    assert.equal(calls[0].options.target, 'http://ks-console-embed.kubesphere-system.svc');
    assert.equal(calls[0].options.changeOrigin, true);
  } finally {
    if (prev === undefined) delete process.env.V3DIST_UPSTREAM;
    else process.env.V3DIST_UPSTREAM = prev;
  }
});
