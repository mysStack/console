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

test('does not register the legacy repository URL in the client router', () => {
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

  assert.equal(legacyRoute, undefined, 'the client router must not claim the legacy URL');
  assert.doesNotMatch(source.getFullText(), /import \{ Navigate \} from 'react-router-dom';/);

  assert.doesNotMatch(
    source.getFullText(),
    /import ManageListLayout from '\.\.\/containers\/Base\/ListLayout';/,
  );
});
