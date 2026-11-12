import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Module from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';

// The preloader owns a sandbox before the list has received any lifecycle
// callback. Destroying that sandbox invalidates both its pending bootstrap
// and the live head/body used by its asynchronous unmount hook.
for (const phase of ['loading', 'mounted']) {
  test(`first list preserves the ${phase} sandbox owned by the global preloader`, async () => {
    const effects: Array<() => unknown> = [];
    const readiness: boolean[] = [];
    const timers: Array<() => void> = [];
    const sandbox = { provide: { props: {} }, head: { listeners: [] }, phase };
    let cached: typeof sandbox | undefined = sandbox;
    let finishPreload: () => void;
    const preload = new Promise<void>(resolve => {
      finishPreload = resolve;
    });
    const startup = preload.then(() => cached?.provide);
    const Embed = () => null;
    Embed.destroyApp = () => {
      cached = undefined;
    };
    const stubs: Record<string, unknown> = {
      react: {
        ...React,
        useEffect: (effect: () => unknown) => effects.push(effect),
        useState: (initial: unknown) => [
          typeof initial === 'boolean' && readiness.includes(true) ? true : initial,
          (value: boolean) => readiness.push(value),
        ],
      },
      'wujie-react': { __esModule: true, default: Embed },
      '@ks-console/shared': { getResourceListCacheVersion: () => '0' },
      './revive': { reviveConsoleV3Instance: async () => {} },
    };
    const file = require.resolve('./index.tsx');
    const saved = new Map<string, any>();
    const resolveFilename = (Module as any)._resolveFilename;
    const sharedSource = require.resolve('@ks-console/shared/src/index.ts');
    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;
    const previousGlobals = (globalThis as any).globals;
    try {
      (globalThis as any).window = {
        location: { host: 'ks.test', origin: 'http://ks.test' },
        setTimeout: (callback: () => void) => {
          timers.push(callback);
          return timers.length;
        },
        clearTimeout: () => {},
      };
      // A preloader's host is inside its iframe, outside the visible document.
      (globalThis as any).document = { querySelector: () => null };
      (globalThis as any).globals = { user: { username: 'test-user' } };
      (Module as any)._resolveFilename = function (name: string, ...args: any[]) {
        return name === '@ks-console/shared'
          ? sharedSource
          : resolveFilename.call(this, name, ...args);
      };
      for (const [name, exports] of Object.entries(stubs)) {
        const id = require.resolve(name);
        saved.set(id, require.cache[id]);
        require.cache[id] = { id, filename: id, loaded: true, exports } as any;
      }
      delete require.cache[file];
      const ResourceList = require('./index.tsx').default;
      renderToStaticMarkup(
        React.createElement(ResourceList, {
          resource: 'deployments',
          url: '//ks.test/consolev3/ws/clusters/host/projects/ns/deployments',
        }),
      );
      if (phase === 'mounted') {
        finishPreload!();
        await startup;
      }
      for (const effect of effects) effect();
      assert.equal(cached, sandbox, 'the first list must let Wujie reuse its existing preloader');
      assert.deepEqual(readiness, [true]);
      if (phase === 'loading') {
        effects.length = 0;
        renderToStaticMarkup(
          React.createElement(ResourceList, {
            resource: 'deployments',
            url: '//ks.test/consolev3/ws/clusters/host/projects/ns/deployments',
          }),
        );
        for (const effect of effects) effect();
        assert.equal(timers.length, 1);
        timers[0]();
        assert.equal(
          cached,
          sandbox,
          'the verification timer must not destroy an unfinished first boot',
        );
      }
      finishPreload!();
      assert.deepEqual(await startup, { props: {} }, 'bootstrap still has its original sandbox');
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
      (globalThis as any).globals = previousGlobals;
      (Module as any)._resolveFilename = resolveFilename;
      delete require.cache[file];
      for (const [id, value] of saved) {
        if (value) require.cache[id] = value;
        else delete require.cache[id];
      }
    }
  });
}
