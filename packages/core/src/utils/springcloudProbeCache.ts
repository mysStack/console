/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * V3 checks whether the springcloud component is installed before it renders a
 * project or cluster page, and that check blocks the first row. The probe is a
 * name-filtered customresourcedefinitions list served by ks-apiserver, which
 * costs 0.9–1.6 s on this test cluster even though it answers with an empty
 * list (34 bytes); the same request from the host realm costs the same, so the
 * delay is on the server side of that one query, not in V3's boot.
 *
 * V3 is served from the sealed `v3dist` bundle and the host cannot intercept an
 * iframe request, so the only host-side lever is to answer repeat probes from a
 * short-lived cache inside the sandbox. The check is read-only and cluster
 * scoped, and its answer only changes when the component is installed or
 * removed, so a five minute cache keeps behaviour and removes the wait from
 * every project switch after the first one.
 */
export const SPRINGCLOUD_PROBE_CACHE_TTL_MS = 300_000;
export const SPRINGCLOUD_CRD_NAME = 'configurations.springcloud.kubesphere.io';

const PROBE_CACHE_FLAG = '__KS_SPRINGCLOUD_PROBE_CACHE__';

/**
 * Runs as an inline script inside the Wujie sandbox before the V3 bundle, so
 * the very first probe is already covered. Plain ES5 on purpose: it is injected
 * as text, not compiled, and must not reference anything outside itself.
 */
export const SPRINGCLOUD_PROBE_CACHE_SOURCE = `(function (win) {
  if (!win || typeof win.fetch !== 'function' || win.${PROBE_CACHE_FLAG}) return;
  var TTL = ${SPRINGCLOUD_PROBE_CACHE_TTL_MS};
  var NAME = '${SPRINGCLOUD_CRD_NAME}';
  var original = win.fetch;
  var cache = {};
  win.${PROBE_CACHE_FLAG} = cache;

  function matches(input) {
    if (!input) return false;
    var url = typeof input === 'string' ? input : input.url || '';
    return url.indexOf('customresourcedefinitions') !== -1 && url.indexOf('name=' + NAME) !== -1;
  }

  function now() {
    return (win.Date || Date).now();
  }

  function build(record) {
    if (!win.Response) return null;
    try {
      return new win.Response(record.body, {
        status: record.status,
        statusText: record.statusText,
        headers: record.headers,
      });
    } catch (e) {
      return null;
    }
  }

  win.fetch = function (input, init) {
    if (!matches(input)) return original.apply(win, arguments);
    var method = (init && init.method) || 'GET';
    if (String(method).toUpperCase() !== 'GET') return original.apply(win, arguments);
    var url = typeof input === 'string' ? input : input.url;
    var hit = cache[url];
    if (hit && now() - hit.at < TTL) {
      var rebuilt = build(hit);
      if (rebuilt) return Promise.resolve(rebuilt);
    }
    var inflight = cache['#' + url];
    if (!inflight) {
      inflight = original.apply(win, arguments).then(function (response) {
        if (!response || !response.clone || response.status < 200) {
          return { raw: response };
        }
        var headers = {};
        try {
          response.headers.forEach(function (value, key) {
            headers[key] = value;
          });
        } catch (e) {}
        return response.clone().text().then(function (body) {
          var record = {
            at: now(),
            body: body,
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          };
          if (response.ok) cache[url] = record;
          return { record: record };
        });
      });
      cache['#' + url] = inflight;
      var release = function () {
        delete cache['#' + url];
      };
      inflight.then(release, release);
    }
    return cache['#' + url].then(function (result) {
      var rebuilt = result.record ? build(result.record) : null;
      return rebuilt || result.raw;
    });
  };
})(window);`;

/**
 * Wujie loads `jsBeforeLoaders` before the sub-application scripts, both during
 * `preloadApp` and on a fresh mount.
 */
export function createConsoleV3SpringCloudProbeCachePlugin() {
  return { jsBeforeLoaders: [{ content: SPRINGCLOUD_PROBE_CACHE_SOURCE }] };
}
