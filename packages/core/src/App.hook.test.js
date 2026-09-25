const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const appSource = fs.readFileSync(`${__dirname}/App.tsx`, 'utf8');

test('initializes workspace aliases from an effect instead of rendering', () => {
  assert.doesNotMatch(appSource, /\n\s*getWorkspaces\(\);/);
  assert.match(appSource, /useEffect\(\(\) => \{[\s\S]*getWorkspaces\(/);
});
