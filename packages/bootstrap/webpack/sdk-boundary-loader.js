/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const path = require('path');
const ts = require('typescript');
const loadingBoundaries = require('./loading-boundaries');

module.exports = function sdkBoundaryLoader(source) {
  if (this.mode !== 'production') return source;
  const root = this.rootContext;
  const boundaries = loadingBoundaries(root);
  const index = path.join(root, 'packages/shared/src/index.ts');
  let exports = boundaries.components;
  if (this.resourcePath === index) {
    const program = ts.createProgram([index], {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.React,
      skipLibCheck: true,
      esModuleInterop: true,
    });
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(program.getSourceFile(index));
    exports = new Map();
    for (const item of checker.getExportsOfModule(symbol)) {
      const actual = item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item;
      if (!(actual.flags & ts.SymbolFlags.Value)) continue;
      const target = boundaries.shared.resolveExport(index, item.name);
      if (!target || target.typeOnly) throw new Error(`Unresolved SDK export ${item.name}`);
      exports.set(item.name, target);
    }
  }
  for (const target of exports.values()) {
    this.addDependency(
      path.isAbsolute(target.file) ? target.file : require.resolve(target.file, { paths: [root] }),
    );
  }
  const header =
    'Object.defineProperty(exports,"__esModule",{value:true});\n' +
    'Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});\n';
  return (
    header +
    Array.from(exports, ([name, target]) => {
      const member = target.name === '*' ? '' : `[${JSON.stringify(target.name)}]`;
      return `Object.defineProperty(exports,${JSON.stringify(name)},{enumerable:true,get:function(){return require(${JSON.stringify(target.file)})${member};}});`;
    }).join('\n')
  );
};
