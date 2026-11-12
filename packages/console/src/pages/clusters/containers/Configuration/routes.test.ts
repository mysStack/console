import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'routes.tsx'), 'utf8');

test('cluster ServiceAccount list route uses the native implementation', () => {
  assert.match(source, /import ServiceAccounts from '\.\/ServiceAccounts';/);
  assert.doesNotMatch(source, /ServiceAccounts\/Embed/);
});
