/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const fs = require('node:fs');
const path = require('node:path');

// Resolve shared barrel exports to their defining modules while preserving aliases.
// This keeps the public SDK available without including it in the host entry.
module.exports = function createLeafImports(ts, root) {
  const sourceCache = new Map();
  const exportCache = new Map();
  const rewrites = new Map();

  function resolveFile(from, specifier) {
    let base;
    if (specifier === '@ks-console/shared') base = path.join(root, 'packages/shared/src');
    else if (specifier.startsWith('.')) base = path.resolve(path.dirname(from), specifier);
    else return undefined;
    return [
      base + '.ts',
      base + '.tsx',
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ].find(candidate => fs.existsSync(candidate));
  }

  function readSource(filename) {
    if (!sourceCache.has(filename)) {
      sourceCache.set(
        filename,
        ts.createSourceFile(
          filename,
          fs.readFileSync(filename, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        ),
      );
    }
    return sourceCache.get(filename);
  }

  function resolveExport(filename, name, visited = new Set()) {
    const key = filename + ':' + name;
    if (exportCache.has(key)) return exportCache.get(key);
    if (visited.has(key)) return undefined;
    visited = new Set(visited).add(key);
    const source = readSource(filename);
    const imports = new Map();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
      const target = resolveFile(filename, statement.moduleSpecifier.text);
      if (!target) continue;
      const clause = statement.importClause;
      if (clause.name) imports.set(clause.name.text, { file: target, name: 'default' });
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        imports.set(clause.namedBindings.name.text, { file: target, name: '*' });
      } else if (clause.namedBindings) {
        for (const item of clause.namedBindings.elements) {
          imports.set(item.name.text, {
            file: target,
            name: item.propertyName?.text || item.name.text,
          });
        }
      }
    }
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement)) {
        const target =
          statement.moduleSpecifier && resolveFile(filename, statement.moduleSpecifier.text);
        if (
          statement.exportClause &&
          ts.isNamespaceExport(statement.exportClause) &&
          statement.exportClause.name.text === name &&
          target
        ) {
          const result = { file: target, name: '*' };
          exportCache.set(key, result);
          return result;
        }
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          const item = statement.exportClause.elements.find(item => item.name.text === name);
          if (!item) continue;
          const original = item.propertyName?.text || item.name.text;
          const imported = imports.get(original);
          const result = target
            ? resolveExport(target, original, visited)
            : imported?.name === '*'
              ? imported
              : imported
                ? resolveExport(imported.file, imported.name, visited)
                : { file: filename, name };
          if (result) {
            exportCache.set(key, result);
            return result;
          }
        } else if (!statement.exportClause && target) {
          const result = resolveExport(target, name, visited);
          if (result) {
            exportCache.set(key, result);
            return result;
          }
        }
      }
      const modifiers = statement.modifiers || [];
      const exported = modifiers.some(item => item.kind === ts.SyntaxKind.ExportKeyword);
      const isDefault = modifiers.some(item => item.kind === ts.SyntaxKind.DefaultKeyword);
      if (
        (name === 'default' && (ts.isExportAssignment(statement) || (exported && isDefault))) ||
        (exported &&
          !isDefault &&
          (statement.name?.text === name ||
            (ts.isVariableStatement(statement) &&
              statement.declarationList.declarations.some(item => item.name.text === name))))
      ) {
        const result = {
          file: filename,
          name,
          typeOnly: ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement),
        };
        exportCache.set(key, result);
        return result;
      }
    }
    return undefined;
  }

  function transformer(context) {
    const factory = context.factory;
    return source => {
      const statements = [];
      for (const statement of source.statements) {
        if (
          ts.isExportDeclaration(statement) &&
          statement.moduleSpecifier &&
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause) &&
          !statement.isTypeOnly
        ) {
          const target = resolveFile(source.fileName, statement.moduleSpecifier.text);
          if (target?.includes('/packages/shared/src/') && /\/index\.tsx?$/.test(target)) {
            const remaining = [];
            for (const item of statement.exportClause.elements) {
              const resolved = resolveExport(target, item.propertyName?.text || item.name.text);
              if (resolved?.typeOnly) continue;
              if (!resolved || resolved.file === target) {
                remaining.push(item);
                continue;
              }
              const clause =
                resolved.name === '*'
                  ? factory.createNamespaceExport(item.name)
                  : factory.createNamedExports([
                      factory.createExportSpecifier(
                        false,
                        factory.createIdentifier(resolved.name),
                        item.name,
                      ),
                    ]);
              statements.push(
                factory.createExportDeclaration(
                  undefined,
                  undefined,
                  false,
                  clause,
                  factory.createStringLiteral(resolved.file),
                ),
              );
              rewrites.set(source.fileName + ':export:' + item.name.text, {
                from: target,
                to: resolved.file,
                export: resolved.name,
              });
            }
            if (remaining.length) {
              statements.push(
                factory.updateExportDeclaration(
                  statement,
                  statement.decorators,
                  statement.modifiers,
                  false,
                  factory.createNamedExports(remaining),
                  statement.moduleSpecifier,
                ),
              );
            }
            continue;
          }
        }
        if (
          !ts.isImportDeclaration(statement) ||
          statement.importClause?.isTypeOnly ||
          !statement.importClause?.namedBindings ||
          !ts.isNamedImports(statement.importClause.namedBindings)
        ) {
          statements.push(statement);
          continue;
        }
        const target = resolveFile(source.fileName, statement.moduleSpecifier.text);
        if (
          !target ||
          !target.includes('/packages/shared/src/') ||
          !/\/index\.tsx?$/.test(target)
        ) {
          statements.push(statement);
          continue;
        }
        const remaining = [];
        for (const item of statement.importClause.namedBindings.elements) {
          const resolved = resolveExport(target, item.propertyName?.text || item.name.text);
          if (resolved?.typeOnly) continue;
          if (!resolved || resolved.file === target) {
            remaining.push(item);
            continue;
          }
          let clause;
          if (resolved.name === 'default') {
            clause = factory.createImportClause(
              statement.importClause.isTypeOnly,
              item.name,
              undefined,
            );
          } else if (resolved.name === '*') {
            clause = factory.createImportClause(
              statement.importClause.isTypeOnly,
              undefined,
              factory.createNamespaceImport(item.name),
            );
          } else {
            clause = factory.createImportClause(
              statement.importClause.isTypeOnly,
              undefined,
              factory.createNamedImports([
                factory.createImportSpecifier(
                  false,
                  resolved.name === item.name.text
                    ? undefined
                    : factory.createIdentifier(resolved.name),
                  item.name,
                ),
              ]),
            );
          }
          statements.push(
            factory.createImportDeclaration(
              undefined,
              undefined,
              clause,
              factory.createStringLiteral(resolved.file),
            ),
          );
          rewrites.set(source.fileName + ':' + item.name.text, {
            from: target,
            to: resolved.file,
            export: resolved.name,
          });
        }
        if (remaining.length || statement.importClause.name) {
          statements.push(
            factory.updateImportDeclaration(
              statement,
              statement.decorators,
              statement.modifiers,
              factory.updateImportClause(
                statement.importClause,
                statement.importClause.isTypeOnly,
                statement.importClause.name,
                remaining.length ? factory.createNamedImports(remaining) : undefined,
              ),
              statement.moduleSpecifier,
            ),
          );
        }
      }
      return factory.updateSourceFile(source, statements);
    };
  }

  return { transformer, rewrites, resolveExport };
};
