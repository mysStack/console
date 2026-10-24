// 重建 Workload 顶层元数据定向 REA 输入：只解析当前编译制品，不执行其代码。
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

const targets = [
  {
    bundle: 'packages/bootstrap/assets/v3dist/1.9ca3a76d71946712055c.js',
    id: 2439,
    output: 'webpack-2439.js',
    locate(code, ast) {
      const matches = [];
      traverse(ast, {
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
          const factory = p.node.arguments[0].elements[2439 - base];
          if (factory) matches.push(factory);
        },
      });
      return matches;
    },
  },
  {
    bundle: 'packages/bootstrap/assets/v3dist/main.558f452048e49db23323.js',
    id: 52,
    output: 'webpack-main-52.js',
    locate(code, ast) {
      const matches = [];
      traverse(ast, {
        ArrayExpression(p) {
          const factory = p.node.elements[52];
          if (!factory) return;
          const source = code.slice(factory.start, factory.end);
          if (source.includes('updateLabels') && source.includes('matchLabels'))
            matches.push(factory);
        },
      });
      return matches;
    },
  },
];

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const provenance = {
  sourceCommit: git(['rev-parse', 'HEAD']),
  artifactTree: git(['rev-parse', 'HEAD:packages/bootstrap/assets/v3dist']),
  method:
    '@babel/parser inert literal webpack factory extraction; character offsets; no target execution',
  bundles: [],
};

for (const target of targets) {
  const code = fs.readFileSync(path.join(root, target.bundle), 'utf8');
  const matches = target.locate(code, parser.parse(code));
  if (matches.length !== 1) throw new Error(`没有唯一定位工厂 ${target.id}: ${matches.length}`);
  const factory = matches[0];
  const source = code.slice(factory.start, factory.end);
  fs.writeFileSync(path.join(destination, target.output), `module.exports = ${source};\n`);
  provenance.bundles.push({
    path: target.bundle,
    sha256: digest(code),
    factory: {
      id: target.id,
      start: factory.start,
      end: factory.end,
      sha256: digest(source),
      analysisFile: target.output,
    },
  });
}

fs.writeFileSync(
  path.join(destination, 'provenance.json'),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(JSON.stringify(provenance, null, 2));
