const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const webpack = require('webpack');
const createEntryConfig = require('../packages/bootstrap/webpack/webpack.entries.conf');

function compile(config) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.run((error, stats) => {
      compiler.close(closeError => {
        if (error || closeError) return reject(error || closeError);
        if (stats.hasErrors()) return reject(Error(stats.toString({ all: false, errors: true })));
        resolve(
          stats.toJson({
            all: false,
            warnings: true,
            entrypoints: true,
            modules: true,
            nestedModules: true,
            assets: true,
          }),
        );
      });
    });
  });
}
function moduleNames(modules) {
  return modules.flatMap(item => [item.name || '', ...moduleNames(item.modules || [])]);
}
(async () => {
  const iconEntry = createEntryConfig.createIconEntry();
  const manifest = {};
  try {
    for (const [name, maximum] of [
      ['auth', 220 * 1024],
      ['navigator', 40 * 1024],
    ]) {
      const stats = await compile(createEntryConfig(name, iconEntry));
      if (stats.warnings.length) throw Error(stats.warnings.map(value => value.message).join('\n'));
      const forbidden = moduleNames(stats.modules).filter(value =>
        /packages\/(?:shared|core)\/src\/index\.ts|wujie|systemjs/i.test(value),
      );
      if (forbidden.length)
        throw Error(`Unexpected host dependencies in ${name}: ${forbidden.join(', ')}`);
      const assets = stats.entrypoints[name].assets.map(item => item.name);
      const js = assets.filter(asset => asset.endsWith('.js'));
      const css = assets.filter(asset => asset.endsWith('.css'));
      const gzipBytes = js.reduce(
        (sum, asset) => sum + zlib.gzipSync(fs.readFileSync(path.join('dist', asset))).length,
        0,
      );
      if (!js.length || gzipBytes > maximum)
        throw Error(`${name} JavaScript gzip budget exceeded: ${gzipBytes} > ${maximum}`);
      manifest[name] = { js, css };
      process.stdout.write(JSON.stringify({ entry: name, gzipBytes, assets }) + '\n');
    }
    fs.mkdirSync('dist/entry', { recursive: true });
    fs.writeFileSync('dist/entry/manifest.json.tmp', JSON.stringify(manifest, null, 2));
    fs.renameSync('dist/entry/manifest.json.tmp', 'dist/entry/manifest.json');
  } finally {
    fs.unlinkSync(iconEntry);
    fs.rmdirSync(path.dirname(iconEntry));
  }
})().catch(error => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
