import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'revive.ts'), 'utf8');

test('ConsoleV3 renders a cleared sandbox again without destroying it', () => {
  assert.doesNotMatch(source, /destroyApp\(/);
  assert.match(source, /startApp\(/);
  assert.match(source, /name: 'consolev3'/);
  assert.match(source, /alive: false/);
  assert.match(source, /el: document\.createElement\('div'\)/);
});

test('ConsoleV3 revive failures leave the rebuild path in charge', () => {
  assert.match(source, /catch \(error\)/);
  assert.match(source, /console\.warn/);
});
