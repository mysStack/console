import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

assert.doesNotMatch(source, /ConsoleV3ResourceList/);
assert.match(source, /configMapStore/);
assert.match(source, /ListPage/);
