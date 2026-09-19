const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

global.SERVER_ROOT = path.resolve(__dirname, '..');

const requestPath = require.resolve('../libs/request');
const sessionPath = require.resolve('./session');

function loadHandleLogout(sendGatewayRequest) {
  delete require.cache[sessionPath];
  require.cache[requestPath] = { exports: { sendGatewayRequest } };
  return require('./session').handleLogout;
}

test('logout redirects to login when the backend token has already expired', async () => {
  const handleLogout = loadHandleLogout(async () => {
    throw new Error('Unauthorized');
  });
  const clearedCookies = [];
  const redirects = [];
  const ctx = {
    cookies: {
      get(name) {
        return name === 'oAuthLoginInfo' ? encodeURIComponent('{}') : 'expired-token';
      },
      set(name, value) {
        clearedCookies.push([name, value]);
      },
    },
    headers: {
      origin: 'https://console.example.test',
      referer: 'https://console.example.test/clusters/host',
    },
    redirect(url) {
      redirects.push(url);
    },
  };

  await handleLogout(ctx);

  assert.deepEqual(redirects, ['/login']);
  assert.deepEqual(
    clearedCookies.map(([name]) => name),
    ['token', 'expire', 'refreshToken', 'oAuthLoginInfo', 'authAuthorizeUrl'],
  );
});
