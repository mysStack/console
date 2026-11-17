// Console-target ReverseProxy resources are deliberately excluded by ks-apiserver.
// Resolve only extension static GET/HEAD requests, retaining upstream status codes.
function createExtensionStaticProxy({ loadRegistry } = {}) {
  const cache = new Map();
  const load =
    loadRegistry ||
    (token =>
      require('../libs/request').sendGatewayRequest({
        method: 'GET',
        url: '/apis/extensions.kubesphere.io/v1alpha1/reverseproxies?labelSelector=kubesphere.io%2Freverse-proxy-target%3Dks-console',
        token,
      }));
  async function registry(token) {
    let entry = cache.get(token);
    if (!entry || entry.expires < Date.now()) {
      if (cache.size >= 128) cache.delete(cache.keys().next().value);
      entry = { expires: Date.now() + 30000, promise: Promise.resolve().then(() => load(token)) };
      cache.set(token, entry);
      entry.promise.catch(() => {
        if (cache.get(token) === entry) cache.delete(token);
      });
    }
    return entry.promise;
  }
  return async (ctx, next) => {
    if (!['GET', 'HEAD'].includes(ctx.method) || !ctx.path.startsWith('/extensions-static/'))
      return next();
    const token = ctx.cookies.get('token');
    if (!token) {
      ctx.status = 401;
      ctx.body = 'Authentication required';
      return;
    }
    if (
      !/^\/extensions-static\/[a-z0-9][a-z0-9-]*\/[a-zA-Z0-9_./-]+$/.test(ctx.path) ||
      ctx.path.split('/').includes('..')
    ) {
      ctx.status = 400;
      ctx.body = 'Invalid extension asset path';
      return;
    }
    let resource;
    try {
      const resources = await registry(token);
      resource = resources.items?.find(item => {
        const matcher = item.spec?.matcher;
        return (
          item.metadata?.labels?.['kubesphere.io/reverse-proxy-target'] === 'ks-console' &&
          matcher &&
          ['*', ctx.method].includes(matcher.method) &&
          (matcher.path === ctx.path ||
            (matcher.path?.endsWith('*') && ctx.path.startsWith(matcher.path.slice(0, -1))))
        );
      });
    } catch {
      ctx.status = 502;
      ctx.body = 'Extension proxy registry unavailable';
      return;
    }
    if (!resource) {
      ctx.status = 404;
      ctx.body = 'Extension asset route unavailable';
      return;
    }
    if (resource.status?.state !== 'Available') {
      ctx.status = 503;
      ctx.body = 'Extension upstream unavailable';
      return;
    }
    try {
      const upstream = new URL(resource.spec.upstream.url);
      if (
        !['http:', 'https:'].includes(upstream.protocol) ||
        upstream.username ||
        upstream.password ||
        upstream.search ||
        upstream.hash
      )
        throw Error();
      // Do not silently approximate newer rewrite/header directives.
      if (Object.keys(resource.spec.directives || {}).length) throw Error();
      const proxy = require('./proxy');
      return await proxy('/extensions-static/(.*)', {
        target: upstream.origin,
        changeOrigin: true,
        compressResponse: true,
        events: {
          proxyReq(request) {
            for (const header of ['authorization', 'cookie', 'referer'])
              request.removeHeader(header);
          },
        },
      })(ctx, next);
    } catch {
      if (ctx.res?.headersSent) {
        ctx.res.destroy();
        return;
      }
      ctx.status = 502;
      ctx.body = 'Extension asset proxy unavailable';
    }
  };
}
module.exports = createExtensionStaticProxy();
module.exports.createExtensionStaticProxy = createExtensionStaticProxy;
