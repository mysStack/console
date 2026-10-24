// 重建 Workload 停止语义定向 REA 输入；只解析制品，不执行代码。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../../..');
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('请指定尚不存在的绝对输出目录');
fs.mkdirSync(destination);
const bundle = 'packages/bootstrap/assets/v3dist/main.558f452048e49db23323.js';
const code = fs.readFileSync(path.join(root, bundle), 'utf8');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
let factory;
traverse(parser.parse(code), {
  ArrayExpression(p) {
    if (p.node.start !== 3927) return;
    const candidate = p.node.elements[318];
    if (candidate && code.slice(candidate.start, candidate.end).includes('non-existing'))
      factory = candidate;
  },
});
if (!factory) throw new Error('没有定位 main 工厂 318');
const source = code.slice(factory.start, factory.end);
fs.writeFileSync(path.join(destination, 'webpack-main-318.js'), `module.exports = ${source};\n`);
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const result = {
  sourceCommit: git(['rev-parse', 'HEAD']),
  artifactTree: git(['rev-parse', 'HEAD:packages/bootstrap/assets/v3dist']),
  bundle,
  bundleSha256: digest(code),
  method:
    '@babel/parser inert literal webpack factory extraction; character offsets; no target execution',
  factory: {
    id: 318,
    start: factory.start,
    end: factory.end,
    sha256: digest(source),
    analysisFile: 'webpack-main-318.js',
  },
};
fs.writeFileSync(path.join(destination, 'provenance.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
