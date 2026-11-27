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
  assert.match(source, /markConsoleV3Phase/);
  assert.match(source, /activated/);
  assert.match(source, /render/);
  assert.match(source, /deactivated/);
  assert.match(source, /const isReady = resolvedUrl\.includes\('\/consolev3\/'\)/);
  assert.match(source, /normalizeConsoleV3Url/);
});

test('resource host lets Wujie reuse an existing alive sandbox on first list entry', () => {
  const mountEffect = source.match(
    /if \(!isReady\) return;[\s\S]*?\[isReady, resourceUrl, shouldRebuild\]/,
  );
  assert.ok(mountEffect, 'mount effect not found');
  assert.equal(mountEffect[0].match(/destroyApp\('consolev3'\)/g)?.length, 1);
  assert.match(mountEffect[0], /if \(shouldRebuild\)/);
  assert.doesNotMatch(source, /lastConsoleV3AppWindow|reviveConsoleV3Instance/);
});

test('resource host recovers an empty mount only once for the current URL', () => {
  assert.match(source, /isConsoleV3InstanceMounted\(\)/);
  assert.match(source, /if \(retriedUrlRef.current === resourceUrl\) return/);
  assert.match(source, /retriedUrlRef.current = resourceUrl/);
});

test('resource host observes the shared sandbox on activation', () => {
  assert.match(source, /watchConsoleV3Sandbox\(appWindow/);
});

test('activation records the rendered revision so the first return reuses the app', () => {
  const activation = source.match(/phase === 'activated'[\s\S]*?phase === 'deactivated'/);
  assert.ok(activation, 'activation branch not found');
  assert.match(activation[0], /mountedRevisions\.set\(scopeKey, revision\)/);
  assert.match(activation[0], /mountedResourceUrls\.set\(scopeKey, resourceUrl\)/);
});

test('first legacy V3 boot records the revision without requiring a mount hook', () => {
  const beforeLoad = source.match(/phase === 'beforeLoad'[\s\S]*?phase === 'afterMount'/);
  assert.ok(beforeLoad);
  assert.match(beforeLoad[0], /mountedRevisions\.set\(scopeKey, revision\)/);
});
