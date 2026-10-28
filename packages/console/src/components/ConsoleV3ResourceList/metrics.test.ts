import assert from 'node:assert';
import test from 'node:test';
import {
  getConsoleV3MarkName,
  getConsoleV3ScopeKey,
  getConsoleV3VerifyDelayMs,
  isConsoleV3InstanceMounted,
  isConsoleV3ListCacheExpired,
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
      cacheExpired: false,
      deactivated: false,
      mountedRevision: undefined,
      revision: '0:0',
    }),
    false,
  );
});

test('ConsoleV3 rebuilds a stale cached scope after mutation or TTL expiry', () => {
  const input = {
    cacheExpired: false,
    deactivated: true,
    mountedRevision: '0:0',
    revision: '1:1',
  };

  assert.equal(shouldRebuildConsoleV3Instance(input), true);
  assert.equal(
    shouldRebuildConsoleV3Instance({ ...input, cacheExpired: true, deactivated: false }),
    true,
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

test('ConsoleV3 list cache expires after the configured TTL', () => {
  assert.equal(isConsoleV3ListCacheExpired(undefined, 30_000, 30_000), false);
  assert.equal(isConsoleV3ListCacheExpired(0, 30_000, 30_000), false);
  assert.equal(isConsoleV3ListCacheExpired(0, 30_001, 30_000), true);
});

test('ConsoleV3 verifies a reused instance earlier than a cold mount', () => {
  assert.equal(getConsoleV3VerifyDelayMs(false, 3000), 3000);
  assert.equal(getConsoleV3VerifyDelayMs(true, 3000), 1000);
  assert.equal(getConsoleV3VerifyDelayMs(true, 500), 500);
});
