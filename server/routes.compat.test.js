const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'routes.js'), 'utf8');

test('keeps the component-dock repository permissions through the compatibility redirect', () => {
  const route =
    ".get('/apps-manage/repo', ctx => {\n" +
    "    ctx.redirect('/workspaces/system-workspace/app-repos?global=true');\n  })";
  const routeIndex = source.indexOf(route);
  const catchAllIndex = source.indexOf(".all('(.*)', renderView)");

  assert.notEqual(routeIndex, -1, 'the compatibility redirect must be registered');
  assert.ok(routeIndex < catchAllIndex, 'the redirect must run before the page catch-all');
});
