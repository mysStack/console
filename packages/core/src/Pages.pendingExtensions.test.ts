import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
const sourceRequire = createRequire(join(__dirname, 'Pages.tsx'));
test('remote namespace waits without blocking dashboard or mounting its legacy fallback', async () => {
  const published: any[] = [];
  let finish: () => void = () => {};
  const ready = new Promise<void>(resolve => {
    finish = resolve;
  });
  const legacy = { path: '/whizard-telemetry', element: 'legacy', children: [{ path: '*' }] };
  const globals = {
    context: { routes: [legacy, { path: '/dashboard', element: 'dashboard' }] },
    installedExtensions: [{ extensionName: 'whizard-telemetry' }],
    config: {},
  };
  const react: any = {
    createElement: (type: any, props: any) => ({ type, props }),
    useEffect: (effect: any) => effect(),
  };
  react.default = react;
  react.__esModule = true;
  const modules: any = {
    react,
    '@kubed/components': { Loading: 'Loading' },
    '@ks-console/shared': { useCacheStore: () => [0, () => {}] },
    'react-router-dom': { Navigate: 'Navigate' },
    zustand: {
      create: (initialize: any) => {
        const state: any = {};
        Object.assign(
          state,
          initialize((next: any) => {
            Object.assign(state, next);
            published.push(next.data.routes);
          }),
        );
        return (select: any) => select(state);
      },
    },
    './utils/extensions.remote': { registerRemoteExtensions: () => ready },
    './containers/Session/routes': { sessionRoutes: [] },
    './containers/Errors/routes': { errorRoutes: [] },
    './containers/Errors/404': { NotFound: 'NotFound' },
    './containers/Support': { routes: [] },
  };
  const loaded = { exports: {} as any };
  const ts = sourceRequire('typescript');
  const code = ts.transpileModule(
    readFileSync(join(__dirname, 'Pages.tsx'), 'utf8') + '\nexports.__mount=Pages;',
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    globals,
    Promise,
    require: (id: string) => modules[id] || { __esModule: true, default: [] },
  });
  loaded.exports.__mount();
  const initial = published[0][0].children;
  assert.equal(initial[0].element.type, 'Loading');
  assert.equal(initial[0].children.length, 0);
  assert.equal(initial[1].element, 'dashboard');
  assert.equal(legacy.element, 'legacy');
  globals.context.routes.unshift({ path: '/whizard-telemetry', element: 'remote', children: [] });
  finish();
  await ready;
  await Promise.resolve();
  assert.equal(published[1][0].children[0].element, 'remote');
});
