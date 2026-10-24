// 定向提取当前 V3 镜像 Store/表单/搜索工厂；只解析，不执行目标代码。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../../..');
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw new Error('请指定尚不存在的绝对输出目录');
fs.mkdirSync(output);
const bundle = 'packages/bootstrap/assets/v3dist/1.9ca3a76d71946712055c.js';
const code = fs.readFileSync(path.join(root, bundle), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const provenance = {
  sourceCommit: git(['rev-parse', 'HEAD']),
  artifactTree: git(['rev-parse', 'HEAD:packages/bootstrap/assets/v3dist']),
  bundle,
  bundleSha256: digest(code),
  method: 'Babel inert webpack extraction; UTF-16 character ranges; no target execution',
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
    for (const id of [1040, 2265, 2266]) {
      const factory = p.node.arguments[0].elements[id - base];
      if (!factory) continue;
      const source = code.slice(factory.start, factory.end);
      const analysisFile = `webpack-${id}.js`;
      const wrapped = `module.exports = ${source};\n`;
      fs.writeFileSync(path.join(output, analysisFile), wrapped);
      provenance.factories.push({
        id,
        start: factory.start,
        end: factory.end,
        sha256: digest(source),
        analysisFile,
        analysisSha256: digest(wrapped),
      });
    }
  },
});
if (provenance.factories.length !== 3) throw new Error('登记的三个镜像工厂没有完整定位');
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify(provenance, null, 2));
