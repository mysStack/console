import assert from 'node:assert';
import test from 'node:test';
import * as metrics from './metrics';
import {
  CONSOLE_V3_BOOT_GRACE_MS,
  getConsoleV3InstanceState,
  getConsoleV3MarkName,
  getConsoleV3Sandbox,
  getConsoleV3ScopeKey,
  isConsoleV3BootInFlight,
  isConsoleV3InstanceMounted,
  markConsoleV3Phase,
  normalizeConsoleV3Url,
  shouldRebuildConsoleV3Instance,
  shouldKeepConsoleV3Alive,
} from './metrics';

test('ConsoleV3 lifecycle marks include the resource route', () => {
  assert.equal(
    getConsoleV3MarkName('activated', '//example.test/consolev3/test-wes/configmaps'),
    'consolev3:activated:/consolev3/test-wes/configmaps',
  );
});

test('ConsoleV3 lifecycle marking is safe without browser performance', () => {
  assert.doesNotThrow(() => markConsoleV3Phase('afterMount', '/consolev3/configmaps', undefined));
});

test('ConsoleV3 scope keys include user and resource route', () => {
  assert.equal(
    getConsoleV3ScopeKey(
      'configmaps',
      '/consolev3/test-wes/clusters/host/projects/a/configmaps',
      'admin',
    ),
    'admin:configmaps:/consolev3/test-wes/clusters/host/projects/a/configmaps',
  );
});

test('ConsoleV3 scope guard distinguishes resource scopes', () => {
  const listScope = 'admin:configmaps:/consolev3/test-wes/clusters/host/projects/a/configmaps';
  const otherNamespace = 'admin:configmaps:/consolev3/test-wes/clusters/host/projects/b/configmaps';

  assert.equal(shouldKeepConsoleV3Alive(undefined, listScope), true);
  assert.equal(shouldKeepConsoleV3Alive(listScope, listScope), true);
  assert.equal(shouldKeepConsoleV3Alive(listScope, otherNamespace), false);
});

test('ConsoleV3 reuses the live app when switching resource scopes', () => {
  assert.equal(
    shouldRebuildConsoleV3Instance({
      deactivated: false,
      mountedRevision: undefined,
      revision: '0:0',
    }),
    false,
  );
});

test('ConsoleV3 rebuilds a stale cached scope after a mutation', () => {
  const input = {
    deactivated: true,
    mountedRevision: '0:0',
    revision: '1:1',
  };

  assert.equal(shouldRebuildConsoleV3Instance(input), true);
  assert.equal(shouldRebuildConsoleV3Instance({ ...input, deactivated: false }), false);
});

test('ConsoleV3 reuses a scope the user left idle instead of rebuilding it', () => {
  // Returning after a long detour used to trip the 30 s list cache TTL and pay
  // a ~5 s cold boot. The app re-fetches on activation, so idling is not staleness.
  assert.equal(
    shouldRebuildConsoleV3Instance({
      deactivated: true,
      mountedRevision: '0:0',
      revision: '0:0',
    }),
    false,
  );
});

test('ConsoleV3 treats a rendered ShadowRoot as a mounted app', () => {
  const doc = {
    querySelector: () => ({ shadowRoot: { childElementCount: 1 } }),
  } as unknown as Document;

  assert.equal(isConsoleV3InstanceMounted(doc), true);
});

test('ConsoleV3 treats an emptied ShadowRoot as unmounted', () => {
  const emptied = {
    querySelector: () => ({ shadowRoot: { childElementCount: 0 } }),
  } as unknown as Document;
  const missing = { querySelector: () => null } as unknown as Document;

  assert.equal(isConsoleV3InstanceMounted(emptied), false);
  assert.equal(isConsoleV3InstanceMounted(missing), false);
});

test('ConsoleV3 tells a destroyed sandbox from a cleared one', () => {
  assert.equal(getConsoleV3InstanceState(undefined), 'missing');
  assert.equal(getConsoleV3InstanceState({}), 'missing');
  assert.equal(
    getConsoleV3InstanceState({ __WUJIE: { mountFlag: true, shadowRoot: null } }),
    'missing',
  );
  assert.equal(
    getConsoleV3InstanceState({
      __WUJIE: { mountFlag: true, shadowRoot: { childElementCount: 1 } },
    }),
    'ready',
  );
  assert.equal(
    getConsoleV3InstanceState({
      __WUJIE: { mountFlag: false, shadowRoot: { childElementCount: 0 } },
    }),
    'stale',
  );
  assert.equal(
    getConsoleV3InstanceState({
      __WUJIE: { mountFlag: true, shadowRoot: { childElementCount: 0 } },
    }),
    'stale',
  );
});

test('ConsoleV3 resolves the live sandbox from the host ShadowRoot', () => {
  const sandbox = { alive: true, mountFlag: true };
  const doc = {
    querySelector: () => ({
      shadowRoot: { firstElementChild: { ownerDocument: { defaultView: { __WUJIE: sandbox } } } },
    }),
  } as unknown as Document;

  assert.equal(getConsoleV3Sandbox(doc), sandbox);
  assert.equal(
    getConsoleV3Sandbox({ querySelector: () => null } as unknown as Document),
    undefined,
  );
});

test('ConsoleV3 restores a bare project path to the absolute app URL', () => {
  assert.equal(
    normalizeConsoleV3Url('/dev-workspace/clusters/host/projects/dev-wes/pods', 'ks.test:30881'),
    '//ks.test:30881/consolev3/dev-workspace/clusters/host/projects/dev-wes/pods',
  );
});

test('ConsoleV3 keeps an already absolute app URL unchanged', () => {
  const url = '//ks.test:30881/consolev3/dev-workspace/clusters/host/projects/dev-wes/pods';

  assert.equal(normalizeConsoleV3Url(url, 'ks.test:30881'), url);
});

test('ConsoleV3 leaves an unresolved URL untouched instead of guessing', () => {
  assert.equal(normalizeConsoleV3Url('undefined/pods', 'ks.test:30881'), 'undefined/pods');
});

test('ConsoleV3 keeps no time-based list cache', () => {
  // The TTL forced a destroyApp + cold boot whenever a detour lasted 30 s. It
  // is gone: reuse is bounded by mutations (`mountedRevision`), not by a clock.
  assert.equal('isConsoleV3ListCacheExpired' in metrics, false);
});

test('ConsoleV3 treats a young, unmounted sandbox as a boot in flight', () => {
  const sandbox = { mountFlag: false };

  assert.equal(isConsoleV3BootInFlight(1_000, 2_000, false, sandbox), true);
  // Mounted: the boot finished, nothing left to protect.
  assert.equal(isConsoleV3BootInFlight(1_000, 2_000, true, sandbox), false);
  // No sandbox at all: `destroyApp` would be a no-op, the branch is cold anyway.
  assert.equal(isConsoleV3BootInFlight(1_000, 2_000, false, undefined), false);
  // No host asked for a boot yet.
  assert.equal(isConsoleV3BootInFlight(0, 2_000, false, sandbox), false);
  // A boot that never finished stops shielding the sandbox after the grace.
  assert.equal(
    isConsoleV3BootInFlight(1_000, 1_000 + CONSOLE_V3_BOOT_GRACE_MS, false, sandbox),
    false,
  );
});
