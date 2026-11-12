const compression = require('compression');
const connect = require('koa-connect');
const onHeaders = require('on-headers');

module.exports = (ctx, next) => {
  let upstreamEncoding;
  const compress = connect(
    compression({
      threshold: 2048,
      filter(req, res) {
        upstreamEncoding = res.getHeader('Content-Encoding');
        // Range offsets describe original bytes; bodyless statuses cannot be encoded.
        return (
          !res.getHeader('Content-Range') &&
          ![204, 205, 304].includes(res.statusCode) &&
          compression.filter(req, res)
        );
      },
    }),
  );
  // Register before compression: this runs after its encoding decision, before
  // headers are sent. A transformed representation cannot keep a strong ETag.
  onHeaders(ctx.res, function () {
    const etag = this.getHeader('ETag');
    if (
      (!upstreamEncoding || upstreamEncoding === 'identity') &&
      this.getHeader('Content-Encoding') &&
      typeof etag === 'string' &&
      !etag.startsWith('W/')
    ) {
      this.setHeader('ETag', `W/${etag}`);
    }
  });
  return compress(ctx, next);
};
