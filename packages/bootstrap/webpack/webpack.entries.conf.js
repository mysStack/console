const fs = require('fs');
const path = require('path');
const os = require('os');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

function createIconEntry() {
  const directory = path.dirname(require.resolve('@kubed/icons'));
  const source = fs.readFileSync(path.join(directory, 'index.js'), 'utf8');
  const imports = new Map(
    Array.from(source.matchAll(/(\w+)=_interopRequireDefault\(require\("([^"]+)"\)\)/g), match => [
      match[1],
      match[2],
    ]),
  );
  const exports = Array.from(
    source.matchAll(
      /Object\.defineProperty\(exports,"(\w+)",\{enumerable:true,get:function get\(\)\{return (\w+)\["default"\]\}\}\)/g,
    ),
  );
  const installed = Object.keys(require('@kubed/icons')).filter(name => name !== '__esModule');
  if (
    exports.length !== installed.length ||
    installed.some(name => !exports.some(match => match[1] === name))
  )
    throw Error('The icon leaf mapping does not match the installed package');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-console-entry-icons-'));
  const filename = path.join(temporary, 'icons.mjs');
  const lines = exports.map(match => {
    const relative = imports.get(match[2]);
    if (!relative) throw Error(`Missing icon source for ${match[1]}`);
    const target = path.resolve(directory, relative + '.js');
    if (!fs.existsSync(target)) throw Error(`Missing icon file for ${match[1]}`);
    return `export { default as ${match[1]} } from ${JSON.stringify(target)};`;
  });
  fs.writeFileSync(filename, lines.join('\n'));
  return filename;
}

module.exports = function createEntryConfig(name, iconEntry) {
  const root = process.cwd();
  return {
    context: root,
    mode: 'production',
    devtool: false,
    entry: {
      [name]: path.join(
        root,
        'packages/console/src/entrypoints',
        { auth: 'auth.tsx', navigator: 'navigator.ts', 'config-reference': 'configReference.tsx' }[
          name
        ],
      ),
    },
    output: {
      path: path.join(root, 'dist'),
      filename: 'entry/[name].[contenthash:12].js',
      chunkFilename: 'entry/[name].[contenthash:12].js',
      publicPath: '/dist/',
      hashFunction: 'sha256',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
      alias: {
        '@ks-console/shared$': path.join(
          root,
          'packages/shared/src/entries',
          name === 'config-reference' ? 'configReference.ts' : 'auth.ts',
        ),
        '@kubed/icons$': iconEntry,
        'styled-components': path.join(root, 'node_modules/styled-components'),
        'react/jsx-runtime': require.resolve('react/jsx-runtime.js'),
        'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime.js'),
      },
      fallback: { path: require.resolve('path-browserify') },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: require.resolve('ts-loader'),
            options: {
              transpileOnly: true,
              compilerOptions: {
                module: 'esnext',
                target: 'es2019',
                jsx: 'react',
                esModuleInterop: true,
              },
            },
          },
        },
        { test: /\.css$/, use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')] },
        { test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/, type: 'asset/resource' },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({ 'process.env.KUBESPHERE_EDITION': JSON.stringify('ks') }),
      new MiniCssExtractPlugin({ filename: 'entry/[name].[contenthash:12].css' }),
    ],
    optimization: {
      splitChunks: false,
      runtimeChunk: false,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: 2,
          terserOptions: { format: { comments: false } },
          extractComments: false,
        }),
      ],
    },
    performance: { hints: false },
  };
};
module.exports.createIconEntry = createIconEntry;
