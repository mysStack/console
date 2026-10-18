import assert from 'node:assert/strict';
import test from 'node:test';

import { getCategoryDisplayName } from './categoryOptions';

test('falls back to the category id when the category name is missing', () => {
  assert.equal(getCategoryDisplayName(undefined, 'ctg-uncategorized'), 'ctg-uncategorized');
});

test('uses a placeholder when both category name and id are missing', () => {
  assert.equal(getCategoryDisplayName(undefined, undefined), '-');
});
