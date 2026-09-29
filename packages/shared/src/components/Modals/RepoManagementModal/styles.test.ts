import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const styles = readFileSync(
  'packages/shared/src/components/Modals/RepoManagementModal/styles.ts',
  'utf8',
);

test('keeps repository credential controls inside a narrow modal viewport', () => {
  assert.match(styles, /width: 100%;/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /grid-template-columns: 20px minmax\(0, 1fr\)/);
  assert.match(styles, /\.credential-new-button/);
});
