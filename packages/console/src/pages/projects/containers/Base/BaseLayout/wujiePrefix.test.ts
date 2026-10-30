import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project layout writes the absolute consolev3 prefix only when it changes', () => {
  assert.match(source, /assignConsoleV3UrlPrefixIfChanged/);
  assert.match(source, /getConsoleV3UrlPrefix\(basePrefix\)/);
  assert.doesNotMatch(source, /setUrlPrefixStable\(getConsoleV3UrlPrefix\(basePrefix\)\)/);
  assert.doesNotMatch(source, /setUrlPrefixStable\(basePrefix\)/);
});
