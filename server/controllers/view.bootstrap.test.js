const assert = require('node:assert/strict');
const test = require('node:test');

const user = {
  username: 'fixture-user',
  globalRules: { projects: ['view'] },
  workspaces: ['fixture-workspace'],
};
const config = { multicluster: true, ksVersion: 'v4.1.5', metrics_server: true };
const theme = { title: 'Fixture brand', logo: '/theme/logo.svg', favicon: '/theme/icon.svg' };
const client = { title: 'Console', supportGpuType: ['fixture-gpu'] };
const extensions = [{ name: 'fixture-extension', styleLink: '/fixture.css' }];
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

function loadView(overrides = {}) {
  const calls = [];
  const userArgs = [];
  const session = {
    getClusterRole: async () => 'member',
    getKSConfig: async () => config,
    getCurrentUser: async () => user,
    getK8sRuntime: async () => 'containerd',
    getTheme: async () => theme,
    getOAuthInfo: async () => [],
    ...overrides,
  };
  for (const name of Object.keys(session)) {
    const fn = session[name];
    session[name] = (...args) => {
      calls.push(name);
      if (name === 'getCurrentUser') userArgs.push(args);
      return fn(...args);
    };
  }
  const entry = require('../libs/consoleEntry');
  const stubs = {
    '../libs/consoleEntry': {
      ...entry,
      getConsoleEntryManifest: name => ({ js: [`entry/${name}.fixture.js`], css: [] }),
    },
    '../services/session': session,
    '../services/extension': {
      getInstalledExtensions: async () => {
        calls.push('getInstalledExtensions');
        return extensions;
      },
    },
    '../libs/utils': {
      getServerConfig: () => ({ client }),
      getManifest: () => ({ js: ['main.fixture.js'], css: ['main.fixture.css'] }),
      getDllManifest: () => ({ fixture: 'dll.fixture.js' }),
      getLocaleManifest: () => ({ zh: 'locale.fixture.json' }),
      getV3Manifest: () => ({ js: ['v3.fixture.js'], css: ['v3.fixture.css'] }),
      getV3LocaleManifest: () => ({ zh: 'v3locale.fixture.json' }),
      getImportMap: () => ({ fixture: '/fixture.js' }),
      isValidReferer: path => typeof path === 'string' && path.startsWith('/projects/'),
      safeBase64: { safeAtob: text => Buffer.from(text, 'base64').toString() },
      getThemeConfig: data => ({
        ...data,
        theme: data,
        defaultTheme: { tabTitle: 'Default brand' },
      }),
    },
  };
  const saved = new Map();
  const file = require.resolve('./view');
  try {
    for (const [id, exports] of Object.entries(stubs)) {
      const dependency = require.resolve(id);
      saved.set(dependency, require.cache[dependency]);
      require.cache[dependency] = { id: dependency, filename: dependency, loaded: true, exports };
    }
    delete require.cache[file];
    return { view: require('./view'), calls, userArgs };
  } finally {
    delete require.cache[file];
    for (const [id, value] of saved) {
      if (value) require.cache[id] = value;
      else delete require.cache[id];
    }
  }
}

function context() {
  const rendered = [],
    redirects = [],
    errors = [];
  return {
    path: '/projects/fixture/deployments',
    hostname: 'console.test',
    querystring: '',
    cookies: { get: () => undefined, set: () => {} },
    t: text => text,
    app: { emit: (...args) => errors.push(args) },
    set: () => {},
    render: async (template, data) => rendered.push({ template, data }),
    redirect: url => redirects.push(url),
    rendered,
    redirects,
    errors,
  };
}

for (const [handler, template] of [
  ['renderView', 'index'],
  ['renderV3View', 'consolev3'],
]) {
  test(`${handler} starts independent bootstrap reads while configuration is pending`, async () => {
    const gate = deferred();
    const { view, calls, userArgs } = loadView({ getKSConfig: () => gate.promise });
    const ctx = context();
    const pending = view[handler](ctx);
    try {
      await tick();
      for (const name of ['getKSConfig', 'getCurrentUser', 'getK8sRuntime', 'getTheme']) {
        assert.ok(calls.includes(name), `${name} must not wait for the configuration response`);
      }
      if (handler === 'renderView') assert.ok(calls.includes('getInstalledExtensions'));
      assert.equal(ctx.rendered.length, 0, 'the page must still wait for complete bootstrap data');
    } finally {
      gate.resolve(config);
      await pending;
    }
    assert.equal(ctx.rendered[0].template, template);
    const globals = JSON.parse(decodeURIComponent(ctx.rendered[0].data.globals));
    assert.deepEqual(globals.user, user);
    assert.deepEqual(globals.ksConfig, {
      multicluster: true,
      ksVersion: 'v4.1.5',
      metrics_server: false,
    });
    assert.equal(globals.runtime, 'containerd');
    assert.equal(globals.clusterRole, 'member');
    assert.deepEqual(globals.theme, theme);
    assert.equal(globals.useDefaultTheme, false);
    assert.deepEqual(globals.config.supportGpuType, ['fixture-gpu']);
    assert.equal(userArgs[0][0], ctx);
    assert.equal(userArgs[0][1], 'member');
    assert.equal(calls.filter(x => x === 'getTheme').length, 1);
    if (handler === 'renderView') {
      assert.deepEqual(globals.installedExtensions, extensions);
      assert.deepEqual(ctx.rendered[0].data.extStyles, ['/fixture.css']);
    }
  });

  test(`${handler} does not render before the authenticated user and rules are ready`, async () => {
    const gate = deferred();
    const { view } = loadView({ getCurrentUser: () => gate.promise });
    const ctx = context();
    const pending = view[handler](ctx);
    try {
      await tick();
      assert.equal(ctx.rendered.length, 0);
    } finally {
      gate.resolve(user);
      await pending;
    }
    assert.equal(ctx.rendered[0].template, template);
  });

  test(`${handler} preserves login redirects and reuses only this request's theme on auth failure`, async () => {
    const { view, calls } = loadView({
      getCurrentUser: async () => {
        throw { code: 401 };
      },
    });
    const ctx = context();
    await view[handler](ctx);
    assert.deepEqual(ctx.redirects, ['/login?referer=%2Fprojects%2Ffixture%2Fdeployments']);
    assert.deepEqual(ctx.rendered, []);
    assert.equal(calls.filter(x => x === 'getTheme').length, 1);
  });

  test(`${handler} preserves a backend failure page and its brand`, async () => {
    const { view, calls } = loadView({
      getKSConfig: async () => {
        throw { code: 502 };
      },
    });
    const ctx = context();
    await view[handler](ctx);
    assert.equal(ctx.rendered[0].template, 'error');
    assert.equal(ctx.rendered[0].data.title, 'Fixture brand');
    assert.equal(ctx.rendered[0].data.message, 'Unable to access the backend services');
    assert.equal(calls.filter(x => x === 'getTheme').length, 1);
  });

  test(`${handler} keeps concurrent request themes separate`, async () => {
    const a = deferred(),
      b = deferred();
    const { view, calls } = loadView({ getTheme: ctx => ctx.themeRead });
    const first = context(),
      second = context();
    first.themeRead = a.promise;
    second.themeRead = b.promise;
    const pending = [view[handler](first), view[handler](second)];
    b.resolve({ ...theme, title: 'Second brand' });
    a.resolve({ ...theme, title: 'First brand' });
    await Promise.all(pending);
    assert.equal(
      JSON.parse(decodeURIComponent(first.rendered[0].data.globals)).theme.title,
      'First brand',
    );
    assert.equal(
      JSON.parse(decodeURIComponent(second.rendered[0].data.globals)).theme.title,
      'Second brand',
    );
    assert.equal(calls.filter(x => x === 'getTheme').length, 2);
  });
}

test('login still fetches its theme when no page bootstrap promise is supplied', async () => {
  const { view, calls } = loadView();
  const ctx = context();
  await view.renderLogin(ctx);
  assert.equal(ctx.rendered[0].template, 'index');
  assert.equal(ctx.rendered[0].data.title, 'Fixture brand');
  assert.equal(calls.filter(x => x === 'getTheme').length, 1);
});

test('login stores only the parsed referer and clears a stale referer on an invalid login URL', async () => {
  const { view } = loadView();
  const writes = [];
  const ctx = context();
  ctx.querystring = 'referer=%2Fprojects%2Ffixture%2Fdeployments&lang=zh';
  ctx.cookies.set = (...args) => writes.push(args);
  await view.renderLogin(ctx);
  assert.deepEqual(writes[0], ['referer', '/projects/fixture/deployments']);
  writes.length = 0;
  ctx.querystring = 'referer=https%3A%2F%2Fexternal.invalid';
  await view.renderLogin(ctx);
  assert.deepEqual(writes[0], ['referer', null]);
});

test('an expired standalone enhancement URL preserves its query through the login redirect', async () => {
  const { view } = loadView({
    getCurrentUser: async () => {
      throw { code: 401 };
    },
  });
  const ctx = context();
  ctx.path = '/consolev3/ws/clusters/host/projects/ns/deployments/app/resource-status';
  ctx.originalUrl = ctx.path + '?enhancement=config-reference';
  await view.renderV3View(ctx);
  assert.equal(
    new URL(ctx.redirects[0], 'http://console.test').searchParams.get('referer'),
    ctx.originalUrl,
  );
});

async function withEntryFlags(flags, action) {
  const saved = {};
  for (const [name, value] of Object.entries(flags)) {
    saved[name] = process.env[name];
    process.env[name] = value;
  }
  try {
    await action();
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test('the enabled lightweight login renders its own scripts and preserves theme and OAuth providers', async () => {
  await withEntryFlags({ KS_CONSOLE_LIGHT_AUTH: 'true' }, async () => {
    const { view } = loadView({ getOAuthInfo: async () => [{ name: 'fixture-provider' }] });
    const ctx = context();
    await view.renderLogin(ctx);
    assert.equal(ctx.rendered[0].template, 'entry');
    assert.deepEqual(ctx.rendered[0].data.entry.js, ['entry/auth.fixture.js']);
    const globals = JSON.parse(decodeURIComponent(ctx.rendered[0].data.globals));
    assert.deepEqual(globals.oauthServers, [{ name: 'fixture-provider' }]);
    assert.deepEqual(globals.theme, theme);
    assert.equal(ctx.rendered[0].data.dllManifest, undefined);
  });
});

test('the project navigator waits for authenticated rules without fetching extensions or runtimes', async () => {
  await withEntryFlags({ KS_CONSOLE_PROJECT_NAVIGATOR: 'true' }, async () => {
    const gate = deferred();
    const { view, calls, userArgs } = loadView({ getCurrentUser: () => gate.promise });
    const ctx = context();
    ctx.path = '/project-console/dashboard';
    const pending = view.renderProjectNavigator(ctx);
    await tick();
    assert.equal(ctx.rendered.length, 0);
    gate.resolve(user);
    await pending;
    assert.equal(ctx.rendered[0].template, 'entry');
    assert.deepEqual(ctx.rendered[0].data.entry.js, ['entry/navigator.fixture.js']);
    assert.deepEqual(JSON.parse(decodeURIComponent(ctx.rendered[0].data.globals)).user, user);
    assert.equal(userArgs[0][1], 'member');
    assert.equal(calls.includes('getInstalledExtensions'), false);
    assert.equal(calls.includes('getK8sRuntime'), false);
    assert.equal(calls.includes('getKSConfig'), false);
  });
});

test('a forbidden navigator request returns an exit page without a login redirect loop', async () => {
  await withEntryFlags({ KS_CONSOLE_PROJECT_NAVIGATOR: 'true' }, async () => {
    const { view } = loadView({
      getCurrentUser: async () => {
        throw { code: 403 };
      },
    });
    const ctx = context();
    ctx.path = '/project-console/access/workspaces';
    await view.renderProjectNavigator(ctx);
    assert.equal(ctx.status, 403);
    assert.equal(ctx.rendered[0].template, 'error');
    assert.deepEqual(ctx.redirects, []);
  });
});

test('home consumes a validated post-confirmation return before selecting the default navigator', async () => {
  await withEntryFlags({ KS_CONSOLE_PROJECT_NAVIGATOR: 'true' }, async () => {
    const { view } = loadView();
    const ctx = context();
    ctx.cookies.get = () => '/project-console/workspaces/fixture/projects';
    const writes = [];
    ctx.cookies.set = (...args) => writes.push(args);
    await view.renderConsoleHome(ctx);
    assert.deepEqual(ctx.redirects, ['/project-console/workspaces/fixture/projects']);
    assert.deepEqual(writes, [['referer', null]]);
  });
});

test('an uninitialized navigator account reaches password confirmation with its return preserved', async () => {
  await withEntryFlags({ KS_CONSOLE_PROJECT_NAVIGATOR: 'true' }, async () => {
    const { view } = loadView({ getCurrentUser: async () => ({ ...user, uninitialized: 'true' }) });
    const ctx = context();
    ctx.path = '/project-console/access/workspaces';
    const writes = [];
    ctx.cookies.set = (...args) => writes.push(args);
    await view.renderProjectNavigator(ctx);
    assert.deepEqual(ctx.redirects, ['/password/confirm']);
    assert.deepEqual(writes, [['referer', '/project-console/access/workspaces']]);
    assert.deepEqual(ctx.rendered, []);
  });
});

test('login query parsing does not decode a doubly encoded return path', async () => {
  const { view } = loadView();
  const ctx = context();
  const writes = [];
  ctx.querystring = 'referer=%252Fprojects%252Ffixture%252Fdeployments';
  ctx.cookies.set = (...args) => writes.push(args);
  await view.renderLogin(ctx);
  assert.deepEqual(writes[0], ['referer', null]);
});

test('the enabled native view exposes the enhancement controller only with its entry artifact', async () => {
  await withEntryFlags({ KS_CONSOLE_DEPLOYMENT_ENHANCEMENT: 'true' }, async () => {
    const { view } = loadView();
    const ctx = context();
    await view.renderV3View(ctx);
    const data = ctx.rendered[0].data;
    assert.equal(data.enhancement, true);
    assert.equal(JSON.parse(decodeURIComponent(data.globals)).consoleEntry.enhancement, true);
  });
});

test('the enhancement frame loads its own entry and scopes its bootstrap to the cookie identity', async () => {
  await withEntryFlags({ KS_CONSOLE_DEPLOYMENT_ENHANCEMENT: 'true' }, async () => {
    const { view } = loadView();
    const ctx = context();
    const token = [
      'fixture',
      Buffer.from(
        JSON.stringify({ username: 'fixture-user', exp: Math.floor(Date.now() / 1000) + 300 }),
      ).toString('base64url'),
      'fixture',
    ].join('.');
    ctx.cookies.get = name => (name === 'token' ? token : undefined);
    await view.renderEnhancementFrame(ctx);
    const data = ctx.rendered[0].data;
    assert.equal(data.entryName, 'config-reference');
    assert.equal(JSON.parse(decodeURIComponent(data.globals)).enhancementUser, 'fixture-user');
    assert.deepEqual(data.entry.js, ['entry/config-reference.fixture.js']);
  });
});
