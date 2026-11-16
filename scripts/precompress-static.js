const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Only browser assets belong here. In particular, dist/server.js is moved into
// server/ during packaging and must never leave a public compressed copy.
const STATIC_DIRECTORIES = ['assets', 'css', 'dll', 'entry', 'js', 'locales', 'v3dist'];
const STATIC_EXTENSION = /\.(?:js|css|json|svg)$/i;
const MINIMUM_BYTES = 2048;

function writeRepresentation(filename, body, sourceStat) {
  const temporary = filename + '.tmp-' + process.pid;
  try {
    fs.writeFileSync(temporary, body);
    fs.utimesSync(temporary, sourceStat.atime, sourceStat.mtime);
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function precompressStatic(directory) {
  const result = { files: 0, sourceBytes: 0, gzipBytes: 0, brotliBytes: 0 };

  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        visit(filename);
      } else if (entry.isFile() && STATIC_EXTENSION.test(entry.name)) {
        const sourceStat = fs.statSync(filename);
        if (sourceStat.size < MINIMUM_BYTES) continue;
        const body = fs.readFileSync(filename);
        const gzip = zlib.gzipSync(body, { level: 9 });
        const brotli = zlib.brotliCompressSync(body, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 },
        });
        writeRepresentation(filename + '.gz', gzip, sourceStat);
        writeRepresentation(filename + '.br', brotli, sourceStat);
        result.files++;
        result.sourceBytes += body.length;
        result.gzipBytes += gzip.length;
        result.brotliBytes += brotli.length;
      }
    }
  }

  for (const name of STATIC_DIRECTORIES) {
    const folder = path.join(directory, name);
    if (fs.existsSync(folder) && fs.lstatSync(folder).isDirectory()) visit(folder);
  }
  return result;
}

module.exports = { precompressStatic };

if (require.main === module) {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, '../dist'));
  process.stdout.write(JSON.stringify(precompressStatic(directory)) + '\n');
}
