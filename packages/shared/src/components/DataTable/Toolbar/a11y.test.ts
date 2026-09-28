import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const toolbarSource = readFileSync(
  'packages/shared/src/components/DataTable/Toolbar/index.tsx',
  'utf8',
);

test('names icon-only table toolbar controls for assistive technology', () => {
  assert.match(toolbarSource, /aria-label=\{t\('REFRESH'\)\}/);
  assert.match(toolbarSource, /aria-label=\{t\('CUSTOM_COLUMNS'\)\}/);
});
