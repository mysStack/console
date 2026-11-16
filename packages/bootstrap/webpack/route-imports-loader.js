/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const ts = require('typescript');
const loadingBoundaries = require('./loading-boundaries');

module.exports = function routeImportsLoader(source) {
  if (this.mode !== 'production') return source;
  const file = ts.createSourceFile(this.resourcePath, source, ts.ScriptTarget.Latest, true);
  const replacements = [];
  for (const declaration of file.statements) {
    if (!ts.isImportDeclaration(declaration) || declaration.importClause?.isTypeOnly) continue;
    const clause = declaration.importClause;
    const request = declaration.moduleSpecifier.text;
    if (!clause || (!request.startsWith('.') && request !== '@ks-console/shared')) continue;
    const candidates = [
      ...(clause.name ? [{ local: clause.name, name: 'default' }] : []),
      ...(clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements.map(item => ({
            local: item.name,
            name: item.propertyName?.text || item.name.text,
          }))
        : []),
    ];
    const lazy = new Map();
    for (const item of candidates) {
      let jsx = false;
      let other = false;
      function visit(node) {
        if (node === declaration) return;
        if (ts.isIdentifier(node) && node.text === item.local.text) {
          const parent = node.parent;
          if (
            (ts.isJsxOpeningElement(parent) ||
              ts.isJsxClosingElement(parent) ||
              ts.isJsxSelfClosingElement(parent)) &&
            parent.tagName === node
          )
            jsx = true;
          else other = true;
        }
        ts.forEachChild(node, visit);
      }
      ts.forEachChild(file, visit);
      if (!jsx || other) continue;
      let target = { file: request, name: item.name };
      if (request === '@ks-console/shared') {
        target = loadingBoundaries(this.rootContext).shared.resolveExport(
          this.rootContext + '/packages/shared/src/index.ts',
          item.name,
        );
        if (!target || target.typeOnly || target.name === '*') continue;
      }
      lazy.set(
        item.local.text,
        `const ${item.local.text} = __consoleRouteReact.lazy(() => import(${JSON.stringify(target.file)}).then(module => ({default: module[${JSON.stringify(target.name)}]})));`,
      );
    }
    if (!lazy.size) continue;
    const remaining =
      clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
            .filter(item => !lazy.has(item.name.text))
            .map(item => item.getText(file))
        : [];
    const named =
      clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)
        ? clause.namedBindings.getText(file)
        : remaining.length
          ? `{${remaining.join(', ')}}`
          : '';
    const bindings = [
      clause.name && !lazy.has(clause.name.text) ? clause.name.text : '',
      named,
    ].filter(Boolean);
    const retained = bindings.length
      ? `import ${bindings.join(', ')} from ${JSON.stringify(request)};\n`
      : '';
    replacements.push({
      start: declaration.getStart(file),
      end: declaration.end,
      text: retained + Array.from(lazy.values()).join('\n'),
    });
  }
  for (const change of replacements.sort((a, b) => b.start - a.start))
    source = source.slice(0, change.start) + change.text + source.slice(change.end);
  return replacements.length ? "import * as __consoleRouteReact from 'react';\n" + source : source;
};
