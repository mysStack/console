/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const cache = new Map();

function componentExports(root) {
  const filename = path.join(root, 'node_modules/@kubed/components/esm/index.js');
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = new Map();
  const exports = new Map();
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const request = statement.moduleSpecifier.text;
      const file = request.startsWith('.')
        ? path.resolve(path.dirname(filename), request)
        : request;
      const clause = statement.importClause;
      if (!clause) throw new Error('Component barrel has a side-effect import');
      if (clause.name) imports.set(clause.name.text, { file, name: 'default' });
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        imports.set(clause.namedBindings.name.text, { file, name: '*' });
      } else if (clause.namedBindings) {
        for (const item of clause.namedBindings.elements) {
          imports.set(item.name.text, { file, name: item.propertyName?.text || item.name.text });
        }
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      !statement.moduleSpecifier
    ) {
      for (const item of statement.exportClause.elements) {
        const target = imports.get(item.propertyName?.text || item.name.text);
        if (!target || exports.has(item.name.text)) throw new Error('Unresolved component export');
        exports.set(item.name.text, target);
      }
    } else {
      throw new Error('Unsupported component barrel statement');
    }
  }
  return exports;
}

function iconExports(root) {
  const directory = path.join(root, 'node_modules/@kubed/icons/dist');
  const source = fs.readFileSync(path.join(directory, 'index.js'), 'utf8');
  const bindings = new Map(
    Array.from(source.matchAll(/(\w+)=_interopRequireDefault\(require\("([^"]+)"\)\)/g), match => [
      match[1],
      match[2],
    ]),
  );
  const matches = Array.from(
    source.matchAll(
      /Object\.defineProperty\(exports,"(\w+)",\{enumerable:true,get:function get\(\)\{return (\w+)\["default"\]\}\}\)/g,
    ),
  );
  if (!matches.length || matches.length !== bindings.size)
    throw new Error('Incomplete icon export mapping');
  return new Map(
    matches.map(match => {
      const relative = bindings.get(match[2]);
      if (!relative) throw new Error('Unresolved icon export');
      return [match[1], { file: path.resolve(directory, relative + '.js'), name: 'default' }];
    }),
  );
}

function loadingBoundaries(root) {
  if (!cache.has(root)) {
    cache.set(root, {
      shared: require('./leaf-imports')(ts, root),
      components: componentExports(root),
      icons: iconExports(root),
    });
  }
  return cache.get(root);
}

module.exports = loadingBoundaries;
