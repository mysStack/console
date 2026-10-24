// 重建宿主时区同步定向 REA 输入：只解析当前编译制品，不执行其代码。
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
const factoryIds = new Set([933, 2285]);
const factories = [];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

traverse(parser.parse(code), {
  CallExpression(p) {
    const callee = p.node.callee;
    if (
      callee.type !== 'MemberExpression' ||
      callee.property.name !== 'concat' ||
      callee.object.type !== 'CallExpression' ||
      callee.object.callee.name !== 'Array' ||
      p.node.arguments[0]?.type !== 'ArrayExpression'
    )
      return;
    const base = callee.object.arguments[0]?.value;
    for (const id of factoryIds) {
      const factory = p.node.arguments[0].elements[id - base];
      if (!factory) continue;
      const source = code.slice(factory.start, factory.end);
      if (!source.includes('/etc/localtime')) continue;
      const analysisFile = `webpack-${id}.js`;
      fs.writeFileSync(path.join(destination, analysisFile), `module.exports = ${source};\n`);
      factories.push({
        id,
        start: factory.start,
        end: factory.end,
        sha256: digest(source),
        analysisFile,
      });
    }
  },
});

if (factories.length !== factoryIds.size) {
  throw new Error(`没有唯一定位宿主时区工厂: ${JSON.stringify(factories)}`);
}
factories.sort((left, right) => left.id - right.id);
const provenance = {
  sourceCommit: git(['rev-parse', 'HEAD']),
  artifactTree: git(['rev-parse', 'HEAD:packages/bootstrap/assets/v3dist']),
  bundle,
  bundleSha256: digest(code),
  method:
    '@babel/parser inert literal webpack factory extraction; character offsets; no target execution',
  factories,
};
fs.writeFileSync(
  path.join(destination, 'provenance.json'),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(JSON.stringify(provenance, null, 2));
