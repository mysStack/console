import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('resource host reuses the consolev3 app and exposes activation lifecycle marks', () => {
  assert.match(source, /name="consolev3"/);
  assert.match(source, /alive/);
  assert.match(source, /destroyApp\('consolev3'\)/);
  assert.match(source, /isConsoleV3InstanceMounted/);
  assert.match(source, /shouldRebuildConsoleV3Instance/);
  assert.doesNotMatch(source, /DEFAULT_CONSOLE_V3_LIST_CACHE_TTL|cacheTtlMs/);
  assert.match(source, /markConsoleV3Phase/);
  assert.match(source, /activated/);
  assert.match(source, /render/);
  assert.match(source, /deactivated/);
  assert.match(source, /const isReady = resolvedUrl\.includes\('\/consolev3\/'\)/);
  assert.match(source, /normalizeConsoleV3Url/);
});

test('resource host renders a cleared instance again instead of booting it', () => {
  assert.match(source, /getConsoleV3InstanceState/);
  assert.match(source, /reviveConsoleV3Instance\(resourceUrl\)/);
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  assert.match(mountEffect[0], /getConsoleV3InstanceState\(lastConsoleV3AppWindow\) !== 'stale'/);
});

test('resource host boots on the existing instance when it never saw the shared sandbox', () => {
  // Entering a V3-only page directly (cluster list/detail) creates the app
  // without `alive`; its unmount clears the ShadowRoot and no child window is
  // kept here. `destroyApp` cannot be used to clear that husk on a cold load:
  // it also destroys the instance `preloadApp` is still filling in, and wujie
  // 1.0.25 reports `null._cacheListeners` from the half-built sandbox. Boot on
  // the existing instance and let wujie-react await the running preload.
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  assert.match(mountEffect[0], /!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted\(\)/);
  const coldStart = mountEffect[0].match(
    /!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted\(\)\) \{[\s\S]*?\n    \}/,
  );
  assert.ok(coldStart, 'cold start branch not found');
  assert.doesNotMatch(coldStart[0], /destroyApp|destroyConsoleV3Instance/);
  assert.match(coldStart[0], /consoleV3BootStartedAt = Date\.now\(\)/);
  assert.match(coldStart[0], /setInstanceReady\(true\)/);
});

test('resource host lets a boot in flight finish instead of destroying it', () => {
  // The project layout writes the Wujie prefix twice. The second write used to
  // destroy the sandbox that was still loading the V3 bundle, and wujie 1.0.25
  // reported `null._cacheListeners` from that teardown.
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  assert.match(mountEffect[0], /isConsoleV3BootInFlight\(consoleV3BootStartedAt\)/);
  assert.match(mountEffect[0], /if \(!isConsoleV3BootInFlight\(consoleV3BootStartedAt\)\) \{/);

  const verify = source.match(/const verify = \(\) => \{[\s\S]*?VERIFY_MOUNT_DELAY_MS\);/);
  assert.ok(verify, 'verify timer not found');
  assert.match(verify[0], /isConsoleV3BootInFlight\(consoleV3BootStartedAt\)/);
});

test('resource host destroys the shared app only after its unmount', () => {
  assert.match(source, /import \{ destroyConsoleV3Instance \} from '\.\/destroy'/);
  assert.doesNotMatch(source, /^\s*WujieReact\.destroyApp\('consolev3'\);/m);
  assert.match(source, /consoleV3BootStartedAt = 0;/);
});

test('resource host keeps the child window of the shared sandbox', () => {
  assert.match(source, /let lastConsoleV3AppWindow: ConsoleV3AppWindow \| undefined;/);
  assert.match(source, /lastConsoleV3AppWindow = appWindow \?\? lastConsoleV3AppWindow/);
});

test('resource host keeps the shared sandbox alive for non-alive embeds', () => {
  assert.match(source, /import \{ watchConsoleV3Sandbox \} from '\.\/keepAlive'/);
  assert.match(source, /watchConsoleV3Sandbox\(lastConsoleV3AppWindow\?\.__WUJIE\)/);
});

test('activation records the rendered revision so the first return reuses the app', () => {
  const activation = source.match(/phase === 'activated'[\s\S]*?phase === 'deactivated'/);
  assert.ok(activation, 'activation branch not found');
  assert.match(activation[0], /mountedRevisions\.set\(scopeKey, revision\)/);
  assert.match(activation[0], /mountedResourceUrls\.set\(scopeKey, resourceUrl\)/);
});
