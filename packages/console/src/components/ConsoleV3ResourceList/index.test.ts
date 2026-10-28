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

test('resource host boots a clean app when it never saw the shared sandbox', () => {
  // Entering a V3-only page directly (cluster list/detail) creates the app
  // without `alive`; its unmount clears the ShadowRoot and no child window is
  // kept here. Activating that husk renders nothing, so start from zero.
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  assert.match(mountEffect[0], /!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted\(\)/);
  const coldStart = mountEffect[0].match(
    /!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted\(\)\) \{[\s\S]*?WujieReact\.destroyApp\('consolev3'\)/,
  );
  assert.ok(coldStart, 'cold start branch not found');
  // `destroyApp` is a no-op without an instance and a cold boot is 4.4 s here,
  // while rendering the cleared sandbox again measured 9.7 s.
  assert.match(coldStart[0], /WujieReact\.destroyApp\('consolev3'\)/);
});

test('resource host lets a boot in flight finish instead of destroying it', () => {
  // The project layout writes the Wujie prefix twice. The second write used to
  // destroy the sandbox that was still loading the V3 bundle, and wujie 1.0.25
  // reported `null._cacheListeners` from that teardown.
  const coldStart = source.match(
    /!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted\(\)\) \{[\s\S]*?WujieReact\.destroyApp\('consolev3'\)/,
  );
  assert.ok(coldStart, 'cold start branch not found');
  assert.match(coldStart[0], /isConsoleV3BootInFlight\(consoleV3BootStartedAt\)/);
  assert.match(
    coldStart[0],
    /setInstanceReady\(true\);[\s\S]*?return;[\s\S]*?destroyConsoleV3Instance/,
  );

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
