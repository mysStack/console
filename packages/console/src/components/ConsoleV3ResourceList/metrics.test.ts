import assert from 'node:assert';
import test from 'node:test';
import {
  getConsoleV3MarkName,
  getConsoleV3ScopeKey,
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

test('ConsoleV3 rebuilds the shared app when switching resource scopes', () => {
  assert.equal(
    shouldRebuildConsoleV3Instance({
      activeScopeKey: 'admin:deployments:/consolev3/test-wes/deployments',
      scopeKey: 'admin:services:/consolev3/test-wes/services',
      resourceUrl: '/consolev3/test-wes/services',
      mountedResourceUrl: undefined,
      cacheExpired: false,
      deactivated: false,
      mountedRevision: undefined,
      revision: '0:0',
    }),
    true,
  );
});

test('ConsoleV3 rebuilds a stale cached scope after mutation or TTL expiry', () => {
  const input = {
    activeScopeKey: 'admin:services:/consolev3/test-wes/services',
    scopeKey: 'admin:services:/consolev3/test-wes/services',
    resourceUrl: '/consolev3/test-wes/services',
    mountedResourceUrl: '/consolev3/test-wes/services',
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
