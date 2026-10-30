import assert from 'node:assert/strict';
import test from 'node:test';

import { RuleSnapshots } from './resourceListInvalidation';
import { applySystemWorkspaceProjectRules } from './systemWorkspaceRules';

test('keeps fetched rules when systemWorkspaceProjectRules is missing', () => {
  const fetched = { pods: ['view'] };

  const next = applySystemWorkspaceProjectRules(
    fetched,
    'system-workspace',
    'system-workspace',
    undefined,
  );

  assert.equal(next, fetched);
  assert.doesNotThrow(() => new RuleSnapshots().record('roles|host|system-workspace|ns', next));
});

test('uses systemWorkspaceProjectRules when config provides them', () => {
  const fetched = { pods: ['view'] };
  const override = { pods: ['view', 'edit'] };

  assert.deepEqual(
    applySystemWorkspaceProjectRules(fetched, 'system-workspace', 'system-workspace', override),
    override,
  );
});

test('does not override rules outside the system workspace', () => {
  const fetched = { pods: ['view'] };
  const override = { pods: ['edit'] };

  assert.equal(
    applySystemWorkspaceProjectRules(fetched, 'dev-workspace', 'system-workspace', override),
    fetched,
  );
});

test('recording undefined rules throws Object.keys error (the pre-fix failure mode)', () => {
  const snapshots = new RuleSnapshots();

  assert.throws(
    () => snapshots.record('roles|host|system-workspace|ns', undefined as never),
    (err: unknown) =>
      err instanceof TypeError && /Cannot convert undefined or null to object/.test(String(err)),
  );
});
