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
  const stubs = {
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
    assert.deepEqual(ctx.redirects, ['/login?referer=/projects/fixture/deployments']);
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
