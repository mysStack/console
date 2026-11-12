import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

import * as hooks from './stores/useStore';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const loadExports = (filename: string, dependencies: Record<string, unknown>) => {
  const exports: Record<string, any> = {};
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => dependencies[name] ?? {},
  });
  return exports;
};

test('the public shared entry exposes storeHooks for remote SystemJS extensions', async () => {
  // Execute the real public export graph. Unrelated UI/store modules are kept
  // outside this API contract test so importing it needs no browser or backend.
  const stores = loadExports(path.join(__dirname, 'stores/index.ts'), { './useStore': hooks });
  const shared = loadExports(path.join(__dirname, 'index.ts'), { './stores': stores });

  assert.equal(typeof shared.storeHooks?.getStoreWithQueryHooks, 'function');
  assert.equal(shared.storeHooks.getStoreWithQueryHooks, hooks.getStoreWithQueryHooks);
  const store = shared.storeHooks.getStoreWithQueryHooks({
    module: 'ingress-utils',
    fetchList: async () => ({ data: [], total: 0 }),
  });
  assert.equal(store.module, 'ingress-utils');
  assert.deepEqual(await store.fetchList(), { data: [], total: 0 });
  assert.equal(typeof store.useQueryList, 'function');
  assert.equal(typeof store.useQueryDetail, 'function');
  assert.equal(typeof store.useMutations, 'function');
  assert.equal(typeof store.useInfiniteQueryList, 'function');
});

test('the public PageLayout renders an extension title and its page content', () => {
  const kubed = require.resolve('@kubed/components');
  const saved = require.cache[kubed];
  const layoutFile = path.join(__dirname, 'components/Layouts/PageLayout/index.tsx');
  try {
    require.cache[kubed] = {
      id: kubed,
      filename: kubed,
      loaded: true,
      exports: {
        Banner: ({ title, description }: any) =>
          React.createElement('header', null, React.createElement('h1', null, title), description),
      },
    } as any;
    const dependencies = {};
    Object.defineProperty(dependencies, './Layouts/PageLayout', {
      get: () => require(layoutFile),
    });
    const components = loadExports(path.join(__dirname, 'components/index.ts'), dependencies);
    const shared = loadExports(path.join(__dirname, 'index.ts'), { './components': components });
    assert.equal(typeof shared.PageLayout, 'function');
    const html = renderToStaticMarkup(
      React.createElement(
        shared.PageLayout,
        { title: 'Application routing tools' },
        React.createElement('main', null, 'Domain table'),
      ),
    );
    assert.match(html, /<h1>Application routing tools<\/h1>/);
    assert.match(html, /<main>Domain table<\/main>/);
  } finally {
    if (saved) require.cache[kubed] = saved;
    else delete require.cache[kubed];
    if (require.cache[layoutFile]) delete require.cache[layoutFile];
  }
});
