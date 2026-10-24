// 重建 Pod 模板注解定向 REA 输入：只解析当前编译制品，不执行其代码。
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
const bundle = 'packages/bootstrap/assets/v3dist/1.9ca3a76d71946712055c.js';
const code = fs.readFileSync(path.join(root, bundle), 'utf8');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const factoryId = 2306;
const provenance = {
  sourceCommit: git(['rev-parse', 'HEAD']),
  artifactTree: git(['rev-parse', 'HEAD:packages/bootstrap/assets/v3dist']),
  bundle,
  bundleSha256: digest(code),
  method:
    '@babel/parser inert literal webpack factory extraction; character offsets; no target execution',
  factories: [],
};

traverse(parser.parse(code), {
  CallExpression(p) {
    const c = p.node.callee;
    if (
      c.type !== 'MemberExpression' ||
      c.property.name !== 'concat' ||
      c.object.type !== 'CallExpression' ||
      c.object.callee.name !== 'Array' ||
      p.node.arguments[0]?.type !== 'ArrayExpression'
    )
      return;
    const base = c.object.arguments[0].value;
    const factory = p.node.arguments[0].elements[factoryId - base];
    if (!factory) return;
    const source = code.slice(factory.start, factory.end);
    const analysisFile = `webpack-${factoryId}.js`;
    fs.writeFileSync(path.join(destination, analysisFile), `module.exports = ${source};\n`);
    provenance.factories.push({
      id: factoryId,
      start: factory.start,
      end: factory.end,
      sha256: digest(source),
      analysisFile,
    });
  },
});

if (provenance.factories.length !== 1) throw new Error('没有唯一定位 Pod 模板注解工厂 2306');
fs.writeFileSync(
  path.join(destination, 'provenance.json'),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(JSON.stringify(provenance, null, 2));
