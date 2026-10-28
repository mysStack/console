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
  assert.match(source, /DEFAULT_CONSOLE_V3_LIST_CACHE_TTL = 30_000/);
  assert.match(source, /cacheTtlMs/);
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
  const coldStart = mountEffect[0].match(/!lastConsoleV3AppWindow[\s\S]*?return;/);
  assert.ok(coldStart, 'cold start branch not found');
  assert.match(coldStart[0], /WujieReact\.destroyApp\('consolev3'\)/);
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
