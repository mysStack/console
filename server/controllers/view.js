/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const { startsWith, get } = require('lodash');
const {
  getCurrentUser,
  getKSConfig,
  getK8sRuntime,
  getOAuthInfo,
  getClusterRole,
  getTheme,
} = require('../services/session');

const { getInstalledExtensions } = require('../services/extension');
const {
  getLoginReferer,
  getConsoleReturnPath,
  getConsoleEntryFlags,
  getConsoleEntryManifest,
  getConsoleSessionIdentity,
} = require('../libs/consoleEntry');
const { randomBytes } = require('crypto');

const {
  getServerConfig,
  getManifest,
  getLocaleManifest,
  getImportMap,
  safeBase64,
  getV3Manifest,
  getV3LocaleManifest,
  getThemeConfig,
  getDllManifest,
} = require('../libs/utils');

const { client: clientConfig } = getServerConfig();

const renderIndex = async (ctx, params, themePromise = getTheme(ctx)) => {
  const themeData = await themePromise;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const _theme = getThemeConfig(themeData);
  const { title, favicon, theme, defaultTheme, logo, background } = _theme;
  const useDefaultTheme = !startsWith(logo, '/theme');

  const manifest = getManifest('main');
  const dllManifest = getDllManifest();
  const localeManifest = getLocaleManifest();
  const importMap = getImportMap();
  const extStyles = params?.installedExtensions
    ?.filter(item => !!item.styleLink)
    .map(ext => ext.styleLink);

  await ctx.render('index', {
    manifest,
    dllManifest,
    isDev: global.MODE_DEV,
    title: useDefaultTheme ? defaultTheme?.tabTitle : title,
    favicon,
    background,
    extStyles,
    hostname: ctx.hostname,
    importMap: JSON.stringify(importMap),
    globals: encodeURIComponent(
      JSON.stringify({
        config: clientConfig,
        manifest,
        localeManifest,
        theme,
        defaultTheme,
        useDefaultTheme,
        ...params,
      }),
    ),
  });
};

const renderEntry = async (ctx, name, params, themePromise = getTheme(ctx)) => {
  const entry = getConsoleEntryManifest(name);
  if (!entry) return renderIndex(ctx, params, themePromise);
  const data = getThemeConfig(await themePromise);
  const useDefaultTheme = !startsWith(data.logo, '/theme');
  const nonce = randomBytes(18).toString('base64');
  ctx.set('Cache-Control', 'no-store');
  ctx.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  );
  await ctx.render('entry', {
    title: useDefaultTheme ? data.defaultTheme?.tabTitle : data.title,
    favicon: data.favicon,
    entry,
    entryName: name,
    nonce,
    sharedCss: name === 'auth' ? getManifest('main')['main.css'] : null,
    globals: encodeURIComponent(
      JSON.stringify({
        config: clientConfig,
        manifest: getManifest('main'),
        localeManifest: getLocaleManifest(),
        theme: data.theme,
        defaultTheme: data.defaultTheme,
        useDefaultTheme,
        consoleEntry: getConsoleEntryFlags(),
        ...params,
      }),
    ),
  });
};

const renderAuthentication = (ctx, params) =>
  getConsoleEntryFlags().auth ? renderEntry(ctx, 'auth', params) : renderIndex(ctx, params);

const renderV3Index = async (ctx, params, themePromise = getTheme(ctx)) => {
  const themeData = await themePromise;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const _theme = getThemeConfig(themeData);
  const { theme, defaultTheme, logo } = _theme;
  const useDefaultTheme = !startsWith(logo, '/theme');

  const manifest = getV3Manifest('main');
  const localeManifest = getV3LocaleManifest();

  const consoleEntry = getConsoleEntryFlags();
  consoleEntry.enhancement =
    consoleEntry.enhancement && !!getConsoleEntryManifest('config-reference');

  await ctx.render('consolev3', {
    manifest,
    enhancement: consoleEntry.enhancement,
    isDev: global.MODE_DEV,
    title: clientConfig.title,
    hostname: ctx.hostname,
    globals: encodeURIComponent(
      JSON.stringify({
        config: clientConfig,
        localeManifest,
        consoleEntry,

        theme,
        defaultTheme,
        useDefaultTheme,

        ...params,
      }),
    ),
  });
};

const renderViewErr = async (ctx, err, themePromise = getTheme(ctx), forbiddenAsPage = false) => {
  const themeData = await themePromise;
  const _theme = getThemeConfig(themeData);
  const { title, favicon, logo, defaultTheme } = _theme;
  const useDefaultTheme = !startsWith(logo, '/theme');

  ctx.app.emit('error', err);
  if (err) {
    if (forbiddenAsPage && (err.code === 403 || err.status === 403)) {
      ctx.status = 403;
      await ctx.render('error', {
        title: useDefaultTheme ? defaultTheme?.tabTitle : title,
        favicon,
        message: ctx.t('NO_PERMISSION'),
        t: ctx.t.bind(ctx),
      });
      return;
    }
    if (err.code === 401 || err.code === 403 || err.status === 401) {
      const referer = getConsoleReturnPath(ctx.originalUrl || ctx.url || ctx.path);
      if (referer) {
        ctx.redirect(`/login?referer=${encodeURIComponent(referer)}`);
      } else {
        ctx.redirect('/login');
      }
    } else if (err.code === 502) {
      await ctx.render('error', {
        title: useDefaultTheme ? defaultTheme?.tabTitle : title,
        favicon,
        message: 'Unable to access the backend services',
      });
    } else if (err.code === 'ETIMEDOUT') {
      await ctx.render('error', {
        title: useDefaultTheme ? defaultTheme?.tabTitle : title,
        favicon,
        message: 'Unable to access the api server',
      });
    } else {
      await ctx.render('error', {
        title: useDefaultTheme ? defaultTheme?.tabTitle : title,
        favicon,
        t: ctx.t.bind(ctx),
        message: '',
      });
      ctx.app.emit('error', err);
    }
  } else {
    await ctx.render('error', {
      title: useDefaultTheme ? defaultTheme?.tabTitle : title,
      favicon,
      t: ctx.t.bind(ctx),
    });
  }
};

const renderTerminal = async ctx => {
  const themeData = await getTheme(ctx);
  const _theme = getThemeConfig(themeData);
  const { title, favicon, theme, defaultTheme, logo } = _theme;
  const useDefaultTheme = !startsWith(logo, '/theme');
  const importMap = getImportMap();

  try {
    const manifest = getManifest('terminal');
    const dllManifest = getDllManifest();
    const [user, ksConfig, runtime] = await Promise.all([
      getCurrentUser(ctx),
      getKSConfig(ctx),
      getK8sRuntime(ctx),
    ]);
    const localeManifest = getLocaleManifest();

    await ctx.render('terminal', {
      manifest,
      dllManifest,
      isDev: global.MODE_DEV,
      title: useDefaultTheme ? defaultTheme.tabTitle : title,
      favicon,
      hostname: ctx.hostname,
      importMap: JSON.stringify(importMap),
      globals: encodeURIComponent(
        JSON.stringify({
          config: clientConfig,
          manifest,
          localeManifest,
          user,
          ksConfig,
          runtime,
          theme,
          defaultTheme,
          useDefaultTheme,
        }),
      ),
    });
  } catch (err) {
    await renderViewErr(ctx, err);
  }
};

const renderMarkdown = async ctx => {
  await ctx.render('blank_markdown');
};

const renderView = async ctx => {
  let themePromise;
  try {
    const clusterRole = await getClusterRole(ctx);
    // Theme and user reads do not depend on the configuration response.
    // Share only this request's theme with the success/error render paths.
    themePromise = getTheme(ctx);

    const [ksConfig, user, runtime, installedExtensions, themeData] = await Promise.all([
      getKSConfig(ctx),
      getCurrentUser(ctx, clusterRole),
      getK8sRuntime(ctx),
      getInstalledExtensions(ctx),
      themePromise,
    ]);

    await renderIndex(
      ctx,
      {
        ksConfig: {
          ...ksConfig,
          metrics_server: false,
        },
        user,
        runtime,
        clusterRole,
        installedExtensions,
        config: {
          ...clientConfig,
          supportGpuType: [...clientConfig.supportGpuType],
        },
      },
      themeData,
    );
  } catch (err) {
    await renderViewErr(ctx, err, themePromise);
  }
};

const renderV3View = async ctx => {
  let themePromise;
  try {
    const clusterRole = await getClusterRole(ctx);
    // Theme and user reads do not depend on the configuration response.
    // Share only this request's theme with the success/error render paths.
    themePromise = getTheme(ctx);

    const [ksConfig, user, runtime, themeData] = await Promise.all([
      getKSConfig(ctx),
      getCurrentUser(ctx, clusterRole),
      getK8sRuntime(ctx),
      themePromise,
    ]);

    await renderV3Index(
      ctx,
      {
        ksConfig: {
          ...ksConfig,
          metrics_server: false,
        },
        user,
        runtime,
        clusterRole,
        config: {
          ...clientConfig,
          supportGpuType: [...clientConfig.supportGpuType],
        },
      },
      themeData,
    );
  } catch (err) {
    await renderViewErr(ctx, err, themePromise);
  }
};

const renderLogin = async ctx => {
  ctx.cookies.set('referer', getLoginReferer(ctx));

  const oauthServers = await getOAuthInfo(ctx);

  await renderAuthentication(ctx, {
    oauthServers: oauthServers || [],
  });
};

const renderLoginConfirm = async ctx => {
  const usrName = ctx.cookies.get('defaultUser') || '';
  await renderAuthentication(ctx, {
    user: {
      username: safeBase64.safeAtob(usrName),
      email: ctx.cookies.get('defaultEmail'),
    },
  });
};

const renderProjectNavigator = async ctx => {
  if (!getConsoleEntryFlags().navigator || !getConsoleEntryManifest('navigator')) {
    ctx.redirect('/dashboard');
    return;
  }
  let themePromise;
  try {
    const clusterRole = await getClusterRole(ctx);
    themePromise = getTheme(ctx);
    const user = await getCurrentUser(ctx, clusterRole);
    if (user?.uninitialized === 'true') {
      ctx.cookies.set('referer', getConsoleReturnPath(ctx.originalUrl || ctx.url || ctx.path));
      ctx.redirect('/password/confirm');
      return;
    }
    await renderEntry(ctx, 'navigator', { user, clusterRole, ksConfig: {} }, themePromise);
  } catch (err) {
    await renderViewErr(ctx, err, themePromise, true);
  }
};

const renderPasswordConfirm = async ctx => {
  if (!getConsoleEntryFlags().auth) return renderView(ctx);
  let themePromise;
  try {
    const clusterRole = await getClusterRole(ctx);
    themePromise = getTheme(ctx);
    const user = await getCurrentUser(ctx, clusterRole);
    await renderEntry(ctx, 'auth', { user, clusterRole }, themePromise);
  } catch (err) {
    await renderViewErr(ctx, err, themePromise);
  }
};

const renderConsoleHome = async ctx => {
  const referer = getConsoleReturnPath(ctx.cookies.get('referer'));
  if (referer) {
    ctx.cookies.set('referer', null);
    ctx.redirect(referer);
    return;
  }
  if (getConsoleEntryFlags().navigator && getConsoleEntryManifest('navigator')) {
    ctx.redirect('/project-console/dashboard');
    return;
  }
  await renderView(ctx);
};

const renderEnhancementSession = async ctx => {
  ctx.set('Cache-Control', 'no-store');
  if (!getConsoleEntryFlags().enhancement) {
    ctx.status = 404;
    return;
  }
  const identity = getConsoleSessionIdentity(ctx);
  if (!identity) {
    ctx.status = 401;
    ctx.body = { reason: 'Unauthorized' };
    return;
  }
  ctx.body = identity;
};

const renderEnhancementFrame = async ctx => {
  if (!getConsoleEntryFlags().enhancement || !getConsoleEntryManifest('config-reference')) {
    ctx.status = 404;
    return;
  }
  const identity = getConsoleSessionIdentity(ctx);
  if (!identity) {
    ctx.redirect('/login');
    return;
  }
  await renderEntry(ctx, 'config-reference', {
    user: identity,
    enhancementUser: identity.username,
  });
};

module.exports = {
  renderEnhancementFrame,
  renderEnhancementSession,
  renderConsoleHome,
  renderProjectNavigator,
  renderPasswordConfirm,
  renderView,
  renderV3View,
  renderTerminal,
  renderLogin,
  renderMarkdown,
  renderLoginConfirm,
};
