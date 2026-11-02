import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CONSOLE_V3_MANIFEST_URL,
  ensurePreloadLink,
  injectConsoleV3MainAssetPreloads,
  preloadConsoleV3MainAssetsForRoute,
  resetConsoleV3MainAssetPreloadForTests,
  resolveConsoleV3AssetHref,
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

test('preloadConsoleV3MainAssetsForRoute skips non-list paths', async () => {
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

test('preloadConsoleV3MainAssetsForRoute fetches manifest on list path once', async () => {
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

  const listPath = '/dev-workspace/clusters/host/projects/dev-wes/deployments';
  preloadConsoleV3MainAssetsForRoute(listPath, fakeFetch);
  preloadConsoleV3MainAssetsForRoute(listPath, fakeFetch);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(called, 1);
  assert.equal(links.length, 2);
  assert.equal(links[0].href, '/dist/v3dist/main.a.css');
  assert.equal(links[1].href, '/dist/v3dist/main.b.js');
});

test('initWujie primes V3 main assets before preloadApp', () => {
  const source = readFileSync(__filename.replace(/[^/]+$/, 'wujie.ts'), 'utf8');
  assert.match(source, /preloadConsoleV3MainAssetsForRoute/);
  assert.match(source, /consoleV3AssetPreload/);
  const primeAt = source.indexOf('preloadConsoleV3MainAssetsForRoute(');
  const preloadAppAt = source.indexOf("preloadApp({\n    name: 'consolev3'");
  assert.ok(primeAt >= 0 && preloadAppAt >= 0);
  assert.ok(primeAt < preloadAppAt, 'main asset preload should run before consolev3 preloadApp');
});
