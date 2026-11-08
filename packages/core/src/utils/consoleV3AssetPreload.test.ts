import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const coreSrc = join(process.cwd(), 'packages/core/src');

import {
  CONSOLE_V3_MANIFEST_URL,
  ensurePreloadLink,
  injectConsoleV3MainAssetPreloads,
  preloadConsoleV3MainAssetsForRoute,
  resetConsoleV3MainAssetPreloadForTests,
  resolveConsoleV3AssetHref,
  shouldPreloadConsoleV3MainAssets,
} from './consoleV3AssetPreload';

function installDom() {
  const links: Array<{ rel: string; as: string; href: string }> = [];
  const head = {
    querySelector(sel: string) {
      const hrefMatch = /href="([^"]+)"/.exec(sel);
      const href = hrefMatch?.[1];
      return href ? links.find(l => l.href === href) || null : null;
    },
    appendChild(node: { rel: string; as: string; href: string }) {
      links.push(node);
      return node;
    },
  };
  (globalThis as any).document = {
    head,
    createElement(tag: string) {
      assert.equal(tag, 'link');
      return { rel: '', as: '', href: '' };
    },
  };
  return links;
}

test('resolveConsoleV3AssetHref prefixes v3dist', () => {
  assert.equal(resolveConsoleV3AssetHref('main.abc.js'), '/dist/v3dist/main.abc.js');
  assert.equal(resolveConsoleV3AssetHref('/main.abc.css'), '/dist/v3dist/main.abc.css');
});

test('ensurePreloadLink inserts style and script preloads once', () => {
  const links = installDom();
  assert.equal(ensurePreloadLink('/dist/v3dist/main.css', 'style'), true);
  assert.equal(ensurePreloadLink('/dist/v3dist/main.css', 'style'), false);
  assert.equal(ensurePreloadLink('/dist/v3dist/main.js', 'script'), true);
  assert.deepEqual(
    links.map(l => ({ rel: l.rel, as: l.as, href: l.href })),
    [
      { rel: 'preload', as: 'style', href: '/dist/v3dist/main.css' },
      { rel: 'preload', as: 'script', href: '/dist/v3dist/main.js' },
    ],
  );
});

test('injectConsoleV3MainAssetPreloads maps entrypoint files', () => {
  installDom();
  const injected = injectConsoleV3MainAssetPreloads({
    css: ['main.111.css'],
    js: ['main.222.js'],
  });
  assert.deepEqual(injected, {
    css: ['/dist/v3dist/main.111.css'],
    js: ['/dist/v3dist/main.222.js'],
  });
});

test('shouldPreloadConsoleV3MainAssets skips login/oauth only', () => {
  assert.equal(shouldPreloadConsoleV3MainAssets('/login'), false);
  assert.equal(shouldPreloadConsoleV3MainAssets('/login?referer=/'), false);
  assert.equal(shouldPreloadConsoleV3MainAssets('/oauth/authorize'), false);
  assert.equal(shouldPreloadConsoleV3MainAssets('/'), true);
  assert.equal(shouldPreloadConsoleV3MainAssets('/workspaces'), true);
  assert.equal(
    shouldPreloadConsoleV3MainAssets('/dev-workspace/clusters/host/projects/dev-wes/deployments'),
    true,
  );
});

test('preloadConsoleV3MainAssetsForRoute skips login paths', async () => {
  resetConsoleV3MainAssetPreloadForTests();
  installDom();
  let called = 0;
  const fakeFetch = (async () => {
    called += 1;
    return {
      ok: true,
      json: async () => ({ entrypoints: { main: { js: ['x.js'] } } }),
    };
  }) as unknown as typeof fetch;
  preloadConsoleV3MainAssetsForRoute('/login', fakeFetch);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(called, 0);
});

test('preloadConsoleV3MainAssetsForRoute warms on V4 shell paths once', async () => {
  resetConsoleV3MainAssetPreloadForTests();
  const links = installDom();
  let called = 0;
  const fakeFetch = (async (url: string) => {
    called += 1;
    assert.equal(url, CONSOLE_V3_MANIFEST_URL);
    return {
      ok: true,
      json: async () => ({
        entrypoints: {
          main: { css: ['main.a.css'], js: ['main.b.js'] },
        },
      }),
    };
  }) as unknown as typeof fetch;

  preloadConsoleV3MainAssetsForRoute('/workspaces', fakeFetch);
  preloadConsoleV3MainAssetsForRoute('/workspaces', fakeFetch);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(called, 1);
  assert.equal(links.length, 2);
  assert.equal(links[0].href, '/dist/v3dist/main.a.css');
  assert.equal(links[1].href, '/dist/v3dist/main.b.js');
});

test('initWujie primes V3 main assets before preloadApp', () => {
  const source = readFileSync(join(coreSrc, 'utils/wujie.ts'), 'utf8');
  assert.match(source, /preloadConsoleV3MainAssetsForRoute/);
  assert.match(source, /consoleV3AssetPreload/);
  const primeAt = source.indexOf('preloadConsoleV3MainAssetsForRoute(');
  const preloadAppAt = source.indexOf("preloadApp({\n    name: 'consolev3'");
  assert.ok(primeAt >= 0 && preloadAppAt >= 0);
  assert.ok(primeAt < preloadAppAt, 'main asset preload should run before consolev3 preloadApp');
});

test('run starts initWujie before extension registration', () => {
  const source = readFileSync(join(coreSrc, 'run.tsx'), 'utf8');
  const initAt = source.indexOf('initWujie();');
  const extAt = source.indexOf('await registerInternalExtensions();');
  assert.ok(initAt >= 0 && extAt >= 0);
  assert.ok(initAt < extAt, 'initWujie should run before registerInternalExtensions');
});
