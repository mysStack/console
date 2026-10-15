import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

test('project rule queries are scoped to user and project location', () => {
  assert.match(source, /\['workspaceRule', userName, workspace\]/);
  assert.match(source, /\['holeRules', userName, cluster, workspace, namespace\]/);
});
