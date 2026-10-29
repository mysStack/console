const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  COMPRESS_THRESHOLD,
  createEncoder,
  pickResponseHeaders,
  shouldCompressResponse,
} = require('./proxyCompression');

const jsonResponse = (overrides = {}) => ({
  statusCode: 200,
  method: 'GET',
  requestUrl: '/kapis/clusters/host/resources.kubesphere.io/v1alpha3/nodes',
  acceptEncoding: 'gzip, deflate, br',
  headers: {
    'content-type': 'application/json',
    'content-length': String(COMPRESS_THRESHOLD * 4),
  },
  ...overrides,
});

test('compresses a complete JSON response the client accepts an encoding for', () => {
  assert.equal(shouldCompressResponse(jsonResponse()), true);
});

test('skips responses the client cannot decode or does not want encoded', () => {
  assert.equal(shouldCompressResponse(jsonResponse({ acceptEncoding: undefined })), false);
  assert.equal(shouldCompressResponse(jsonResponse({ acceptEncoding: 'identity' })), false);
  assert.equal(shouldCompressResponse(jsonResponse({ compress: false })), false);
});

test('skips bodies that are not text', () => {
  for (const type of [
    'application/octet-stream',
    'image/png',
    'application/vnd.kubernetes.protobuf',
    'text/plain',
    'text/event-stream',
  ]) {
    const res = jsonResponse();
    res.headers['content-type'] = type;
    assert.equal(shouldCompressResponse(res), false, type);
  }
});

test('skips streams that the upstream keeps writing', () => {
  assert.equal(
    shouldCompressResponse(
      jsonResponse({ requestUrl: '/kapis/clusters/host/pods/x/log?follow=true' }),
    ),
    false,
  );
  assert.equal(
    shouldCompressResponse(
      jsonResponse({ requestUrl: '/kapis/clusters/host/pods?watch=true&resourceVersion=1' }),
    ),
    false,
  );
  // A flag spelled differently in another query value must not trigger the skip.
  assert.equal(
    shouldCompressResponse(
      jsonResponse({ requestUrl: '/kapis/clusters/host/pods?labelSelector=a=follow' }),
    ),
    true,
  );
});

test('compresses chunked JSON, which is how the API answers most lists', () => {
  const chunked = jsonResponse();
  delete chunked.headers['content-length'];
  assert.equal(shouldCompressResponse(chunked), true, 'chunked json');

  const chunkedSvg = jsonResponse();
  delete chunkedSvg.headers['content-length'];
  chunkedSvg.headers['content-type'] = 'image/svg+xml';
  assert.equal(shouldCompressResponse(chunkedSvg), false, 'chunked non-json');
});

test('skips bodies that are tiny, encoded or partial', () => {
  const tiny = jsonResponse();
  tiny.headers['content-length'] = String(COMPRESS_THRESHOLD - 1);
  assert.equal(shouldCompressResponse(tiny), false, 'below threshold');

  const encoded = jsonResponse();
  encoded.headers['content-encoding'] = 'gzip';
  assert.equal(shouldCompressResponse(encoded), false, 'already encoded');

  const partial = jsonResponse({ statusCode: 206 });
  partial.headers['content-range'] = 'bytes 0-99/200';
  assert.equal(shouldCompressResponse(partial), false, 'partial');

  assert.equal(shouldCompressResponse(jsonResponse({ statusCode: 304 })), false, 'not modified');
  assert.equal(shouldCompressResponse(jsonResponse({ method: 'HEAD' })), false, 'head');
});

test('negotiates brotli first, then gzip, and nothing when refused', () => {
  const br = createEncoder('gzip, deflate, br, zstd');
  assert.equal(br.encoding, 'br');
  assert.equal(typeof br.stream.pipe, 'function');
  br.stream.destroy();

  const gzip = createEncoder('gzip, deflate');
  assert.equal(gzip.encoding, 'gzip');
  gzip.stream.destroy();

  assert.equal(createEncoder('identity'), null);
  assert.equal(createEncoder(undefined), null);
  assert.equal(createEncoder('br;q=0, gzip;q=0'), null);
  const gzipOnly = createEncoder('br;q=0, gzip');
  assert.equal(gzipOnly.encoding, 'gzip');
  gzipOnly.stream.destroy();
});

test('drops hop-by-hop headers before they reach koa', () => {
  const picked = pickResponseHeaders({
    connection: 'keep-alive',
    'transfer-encoding': 'chunked',
    'content-type': 'application/json',
    'content-length': '1024',
    'set-cookie': ['a=1'],
  });

  assert.deepEqual(picked, {
    'content-type': 'application/json',
    'content-length': '1024',
    'set-cookie': ['a=1'],
  });
});

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the proxy encodes responses only when the route opts in', () => {
  const source = read('middlewares/proxy.js');

  assert.match(source, /compressResponse/, 'proxy.js must read the option');
  assert.match(source, /selfHandleResponse = true/, 'proxy.js must take over the response');
  assert.match(
    source,
    /proxyRes\.pipe\(encoder\.stream\)\.pipe\(ctx\.res\)/,
    'compressible responses must go through the encoder',
  );
  assert.match(source, /proxyRes\.pipe\(ctx\.res\)/, 'the rest must keep the plain pipe');
  assert.match(source, /content-encoding/, 'the encoded response must advertise its encoding');
});

test('the API proxies opt in and the self-handling file proxies do not', () => {
  const source = read('proxy.js');
  const block = name => {
    const start = source.indexOf(`const ${name} = {`);
    assert.notEqual(start, -1, `${name} must exist`);
    return source.slice(start, source.indexOf('\n};', start));
  };

  assert.match(block('k8sResourceProxy'), /compressResponse: true/);
  assert.match(block('marketplaceApiProxy'), /compressResponse: true/);
  assert.doesNotMatch(block('b2iFileProxy'), /compressResponse/);
  assert.doesNotMatch(block('staticFileProxy'), /compressResponse/);
});
