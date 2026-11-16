/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const ts = require('typescript');
const loadingBoundaries = require('./loading-boundaries');

module.exports = function createLoadingTransformers(root) {
  const boundaries = loadingBoundaries(root);
  const packages = new Map([
    ['@kubed/components', boundaries.components],
    ['@kubed/icons', boundaries.icons],
  ]);
  const externalImports = context => source => {
    const factory = context.factory;
    const statements = [];
    for (const statement of source.statements) {
      const clause = ts.isImportDeclaration(statement) ? statement.importClause : undefined;
      const exports =
        clause &&
        !clause.isTypeOnly &&
        clause.namedBindings &&
        ts.isNamedImports(clause.namedBindings)
          ? packages.get(statement.moduleSpecifier.text)
          : undefined;
      if (!exports) {
        statements.push(statement);
        continue;
      }
      const remaining = [];
      for (const item of clause.namedBindings.elements) {
        const target = exports.get(item.propertyName?.text || item.name.text);
        if (!target) {
          remaining.push(item);
          continue;
        }
        const bindings =
          target.name === '*'
            ? factory.createNamespaceImport(item.name)
            : factory.createNamedImports([
                factory.createImportSpecifier(
                  false,
                  target.name === item.name.text
                    ? undefined
                    : factory.createIdentifier(target.name),
                  item.name,
                ),
              ]);
        const imported =
          target.name === 'default'
            ? factory.createImportClause(false, item.name, undefined)
            : factory.createImportClause(false, undefined, bindings);
        statements.push(
          factory.createImportDeclaration(
            undefined,
            undefined,
            imported,
            factory.createStringLiteral(target.file),
          ),
        );
      }
      if (remaining.length || clause.name) {
        statements.push(
          factory.updateImportDeclaration(
            statement,
            statement.decorators,
            statement.modifiers,
            factory.updateImportClause(
              clause,
              false,
              clause.name,
              remaining.length ? factory.createNamedImports(remaining) : undefined,
            ),
            statement.moduleSpecifier,
          ),
        );
      }
    }
    return factory.updateSourceFile(source, statements);
  };
  return [boundaries.shared.transformer, externalImports];
};
