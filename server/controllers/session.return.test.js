const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
global.SERVER_ROOT = path.resolve(__dirname, '..');
const destination =
  '/consolev3/dev-workspace/clusters/host/projects/dev-wes/deployments/api/resource-status?enhancement=config-reference';

function loadSession(user) {
  const dependency = require.resolve('../services/session');
  const saved = require.cache[dependency];
  const file = require.resolve('./session');
  require.cache[dependency] = {
    exports: {
      login: async () => user,
      loginThird: async () => user,
      oAuthLogin: async () => user,
      createUser: async () => ({}),
      getNewToken: async () => ({
        token: 'fixture-token',
        expire: 'fixture-expire',
        refreshToken: 'fixture-refresh',
      }),
    },
  };
  delete require.cache[file];
  const result = require('./session');
  if (saved) require.cache[dependency] = saved;
  else delete require.cache[dependency];
  delete require.cache[file];
  return result;
}
function context(referer = encodeURIComponent(destination)) {
  const values = new Map([['referer', referer]]);
  return {
    values,
    writes: [],
    redirects: [],
    request: {
      body: { grant_type: 'otp', otp: 'fixture-otp', token: 'fixture-otp-token' },
      ip: '127.0.0.1',
    },
    params: { name: 'fixture-provider' },
    query: {},
    headers: { host: 'console.test' },
    cookies: {
      get: name => values.get(name),
      set(name, value) {
        values.set(name, value);
      },
    },
    app: { emit() {} },
    redirect(value) {
      this.redirects.push(value);
    },
  };
}
const initialized = {
  username: 'fixture-user',
  initialized: true,
  token: 'fixture-token',
  expire: 123,
  refreshToken: 'fixture-refresh',
};

test('malformed return cookies do not prevent otherwise successful local authentication', async () => {
  const ctx = context('%');
  await loadSession(initialized).handleLogin(ctx);
  assert.equal(ctx.body.success, true);
  assert.equal(ctx.body.redirect, '/');
});

test('successful login returns to the scoped enhancement and consumes the return cookie', async () => {
  const ctx = context();
  await loadSession(initialized).handleLogin(ctx);
  assert.equal(ctx.body.redirect, destination);
  assert.equal(ctx.values.get('referer'), null);
});

test('password confirmation retains the validated return path until initialization finishes', async () => {
  const ctx = context();
  await loadSession({ ...initialized, initialized: false }).handleLogin(ctx);
  assert.equal(ctx.body.redirect, '/password/confirm');
  assert.equal(ctx.values.get('referer'), destination);
});

test('registration confirmation returns to the original resource after exchanging the token', async () => {
  const ctx = context(destination);
  await loadSession(initialized).handleLoginConfirm(ctx);
  assert.equal(ctx.body.redirect, destination);
  assert.equal(ctx.values.get('referer'), null);
});

test('OAuth state cannot redirect to an external origin', async () => {
  const ctx = context();
  ctx.query = {
    state: Buffer.from(JSON.stringify({ redirect_url: 'https://external.invalid/' })).toString(
      'base64url',
    ),
  };
  await loadSession(initialized).handleOAuthLogin(ctx);
  assert.deepEqual(ctx.redirects, [destination]);
});

test('OAuth supports an explicit same-origin return without a second redirect', async () => {
  const ctx = context();
  ctx.query = { redirect_url: 'http://console.test/project-console/dashboard' };
  await loadSession(initialized).handleOAuthLogin(ctx);
  assert.deepEqual(ctx.redirects, ['/project-console/dashboard']);
});

test('OAuth preserves the resource return while an account must confirm its password', async () => {
  const ctx = context();
  await loadSession({ ...initialized, initialized: false }).handleOAuthLogin(ctx);
  assert.deepEqual(ctx.redirects, ['/password/confirm']);
  assert.equal(ctx.values.get('referer'), destination);
});
