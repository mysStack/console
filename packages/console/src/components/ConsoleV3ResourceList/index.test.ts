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
  // A cleared ShadowRoot keeps its host: no rebuild, render it in place.
  assert.match(mountEffect[0], /if \(isConsoleV3InstanceMounted\(\)\)/);
});

test('resource host boots a clean app when an empty host was left behind', () => {
  // Entering a V3-only page directly (cluster list/detail) creates the app
  // without `alive`; its unmount clears the ShadowRoot and no child window is
  // kept here. Activating that husk renders nothing, so start from zero.
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  const coldStart = mountEffect[0].match(/if \(!lastConsoleV3AppWindow && hasConsoleV3Host\(\)\) \{[\s\S]*?return;/);
  assert.ok(coldStart, 'empty-host branch not found');
  // Only a host left in the DOM can be a cleared embed.
  assert.match(coldStart[0], /destroyApp\('consolev3'\)/);
});

test('resource host renders a preloaded app in place when no host exists', () => {
  // `initWujie` preloads `consolev3`, and Wujie's `alive` start only activates
  // an existing sandbox, never mounts it: a cold entry would stay blank and
  // destroying the preload first rejected inside Wujie's teardown.
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  const tail = mountEffect[0].slice(mountEffect[0].indexOf('hasConsoleV3Host'));
  assert.ok(tail.length > 0, 'hasConsoleV3Host guard not found');
  assert.match(tail, /reviveConsoleV3Instance\(resourceUrl\)\.then/);
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
