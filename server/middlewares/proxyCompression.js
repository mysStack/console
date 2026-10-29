/*
 * Please refer to the LICENSE file in the root of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Encoding for proxied upstream responses.
 *
 * http-proxy writes to the raw ServerResponse, so koa-compress never sees those
 * responses. Compressible ones are pushed through an encoder here; everything
 * else keeps the plain pipe it always had.
 *
 * koa-compress cannot be reused for this: it passes its brotli options as a
 * top-level key, which Node ignores, so it encodes at the zlib default quality
 * (11). On the 28 MB CRD list that costs tens of seconds of CPU. The encoder
 * below fixes the quality and flushes every chunk so the first byte is not
 * held back until the whole body is encoded.
 */

const zlib = require('zlib');

// RFC 7230 hop-by-hop headers. http-proxy used to strip these itself; with
// selfHandleResponse the proxy has to do it.
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

// Same threshold koa-compress is configured with in server/components/boot.js.
const COMPRESS_THRESHOLD = 2048;

// Upstream keeps writing these responses for as long as the client watches, so
// they are never encoded.
const STREAM_QUERY_FLAGS = ['follow', 'watch'];

// text/plain and text/event-stream are how the API streams logs and events, so
// they are never compressed even without a follow/watch flag.
const COMPRESSIBLE_TYPE =
  /^(?:application\/(?:json|[a-z0-9.+-]+json|javascript|x-javascript|ecmascript|xml|[a-z0-9.+-]+xml)|image\/svg\+xml)/i;

// ks-apiserver streams most JSON lists without a Content-Length, so a known
// length cannot be required. Without one only JSON is compressed: every other
// compressible type could be an open-ended stream.
const JSON_TYPE = /^application\/(?:json|[a-z0-9.+-]+json)$/i;

const hasQueryFlag = (url, flag) => {
  const query = String(url || '').split('?')[1];
  if (!query) return false;

  return query.split('&').some(pair => {
    const [key, value] = pair.split('=');
    return decodeURIComponent(key) === flag && value !== 'false' && value !== '0';
  });
};

// Brotli at quality 4 encodes this API's JSON about 2.5x smaller than gzip at
// the same speed; both flush on every chunk.
const ENCODERS = {
  br: () =>
    zlib.createBrotliCompress({
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
      flush: zlib.constants.BROTLI_OPERATION_FLUSH,
    }),
  gzip: () =>
    zlib.createGzip({
      flush: zlib.constants.Z_SYNC_FLUSH,
    }),
};

const PREFERRED_ENCODINGS = ['br', 'gzip'];

const parseAcceptEncoding = header => {
  const weights = new Map();

  String(header || '')
    .split(',')
    .forEach(part => {
      const [rawName, ...params] = part.trim().split(';');
      const name = rawName.trim().toLowerCase();
      if (!name) return;

      const q = params.map(param => param.trim()).find(param => param.startsWith('q='));
      const value = q ? Number(q.slice(2)) : 1;
      weights.set(name === 'x-gzip' ? 'gzip' : name, Number.isFinite(value) ? value : 1);
    });

  return weights;
};

const weightOf = (weights, encoding) => {
  if (weights.has(encoding)) return weights.get(encoding);
  if (weights.has('*')) return weights.get('*');
  return 0;
};

const acceptsCompression = header => {
  const weights = parseAcceptEncoding(header);
  return PREFERRED_ENCODINGS.some(encoding => weightOf(weights, encoding) > 0);
};

const createEncoder = header => {
  const weights = parseAcceptEncoding(header);

  for (const encoding of PREFERRED_ENCODINGS) {
    if (weightOf(weights, encoding) > 0) {
      return { encoding, stream: ENCODERS[encoding]() };
    }
  }

  return null;
};

const mediaType = contentType =>
  String(contentType || '')
    .split(';')[0]
    .trim();

const isCompressibleType = contentType => COMPRESSIBLE_TYPE.test(mediaType(contentType));

const isJsonType = contentType => JSON_TYPE.test(mediaType(contentType));

const shouldCompressResponse = ({
  statusCode,
  headers = {},
  acceptEncoding,
  requestUrl,
  method = 'GET',
  compress,
}) => {
  if (compress === false) return false;
  if (String(method).toUpperCase() === 'HEAD') return false;
  if (statusCode !== 200) return false;
  if (headers['content-encoding']) return false;
  if (headers['content-range']) return false;
  if (!isCompressibleType(headers['content-type'])) return false;
  if (!acceptsCompression(acceptEncoding)) return false;
  if (STREAM_QUERY_FLAGS.some(flag => hasQueryFlag(requestUrl, flag))) return false;

  // A known length below the koa-compress threshold is not worth encoding.
  const length = Number(headers['content-length']);
  if (headers['content-length'] !== undefined && Number.isFinite(length)) {
    return length >= COMPRESS_THRESHOLD;
  }

  // Without a length, only JSON is safe: it is a finite document even when the
  // upstream writes it in chunks, which is how ks-apiserver answers most lists.
  return isJsonType(headers['content-type']);
};

const pickResponseHeaders = (headers = {}) =>
  Object.entries(headers).reduce((picked, [key, value]) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) picked[key] = value;
    return picked;
  }, {});

module.exports = {
  COMPRESS_THRESHOLD,
  HOP_BY_HOP_HEADERS,
  acceptsCompression,
  createEncoder,
  hasQueryFlag,
  isCompressibleType,
  parseAcceptEncoding,
  pickResponseHeaders,
  shouldCompressResponse,
};
