const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.join(__dirname, 'index.tsx');

function getProperty(object, name) {
  return object.properties.find(
    property =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name)),
  );
}

function getStringValue(property) {
  return property && ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : undefined;
}

test('redirects the legacy repository URL without mounting the removed apps-manage layout', () => {
  const source = ts.createSourceFile(
    sourcePath,
    fs.readFileSync(sourcePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let legacyRoute;
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const pathProperty = getProperty(node, 'path');
      if (getStringValue(pathProperty) === '/apps-manage/repo') {
        legacyRoute = node;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  assert.ok(legacyRoute, 'the legacy repository route must be present');

  const elementProperty = getProperty(legacyRoute, 'element');
  assert.ok(elementProperty && ts.isJsxSelfClosingElement(elementProperty.initializer));
  assert.equal(elementProperty.initializer.tagName.getText(source), 'Navigate');

  const toAttribute = elementProperty.initializer.attributes.properties.find(
    attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'to',
  );
  assert.equal(
    toAttribute?.initializer?.getText(source),
    '"/workspaces/system-workspace/app-repos"',
  );

  const replaceAttribute = elementProperty.initializer.attributes.properties.find(
    attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'replace',
  );
  assert.ok(replaceAttribute, 'the compatibility redirect must replace browser history');

  assert.doesNotMatch(
    source.getFullText(),
    /import ManageListLayout from '\.\.\/containers\/Base\/ListLayout';/,
  );
});
