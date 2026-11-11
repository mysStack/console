import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function renderList(
  params: Record<string, string>,
  cachedNamespace: string | null,
  props: any = {},
) {
  const tables: any[] = [],
    selectors: any[] = [],
    scopes: any[] = [];
  const passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children);
  const stubs: Record<string, any> = {
    'react-router-dom': { useParams: () => params, useNavigate: () => () => undefined },
    '../../../index': {
      useCacheStore: () => [
        cachedNamespace,
        () => {
          throw new Error('Project view must not overwrite cluster selection');
        },
      ],
    },
    '@kubed/components': { Banner: passthrough, Navs: () => null, BannerTip: passthrough },
    '../../DataTable': {
      DataTable: (p: any) => {
        tables.push(p);
        return React.createElement(React.Fragment, null, p.toolbarLeft);
      },
    },
    '../../Selectors/NamespaceSelector': {
      __esModule: true,
      default: (p: any) => {
        selectors.push(p);
        return null;
      },
    },
  };
  const file = require.resolve('./index.tsx'),
    saved = new Map<string, any>();
  const previousT = (global as any).t;
  try {
    (global as any).t = (key: string) => key;
    for (const [name, exports] of Object.entries(stubs)) {
      const id = require.resolve(name);
      saved.set(id, require.cache[id]);
      require.cache[id] = { id, filename: id, loaded: true, exports } as any;
    }
    delete require.cache[file];
    const ListPage = require('./index.tsx').default;
    const store = {
      module: 'secrets',
      getResourceUrl: (scope: any) => {
        scopes.push(scope);
        return scope.namespace ? `/namespaces/${scope.namespace}/secrets` : '/secrets';
      },
    };
    renderToStaticMarkup(
      React.createElement(ListPage, { store, hasNamespaceSelector: true, ...props }),
    );
    return { table: tables[0], selectors, scopes };
  } finally {
    (global as any).t = previousT;
    delete require.cache[file];
    for (const [id, value] of saved) {
      if (value) require.cache[id] = value;
      else delete require.cache[id];
    }
  }
}

test('project lists request the route namespace even when the cluster cache is empty', () => {
  const r = renderList({ cluster: 'host', namespace: 'dev-wes' }, null);
  assert.equal(r.table.url, '/namespaces/dev-wes/secrets');
  assert.deepEqual(r.scopes, [{ cluster: 'host', namespace: 'dev-wes' }]);
  assert.equal(r.selectors.length, 0, 'project pages must not offer All Projects');
});

test('a cached namespace from a cluster list cannot escape or replace the project scope', () => {
  const r = renderList({ cluster: 'host', namespace: 'dev-wes' }, 'other-project');
  assert.equal(r.table.url, '/namespaces/dev-wes/secrets');
  assert.equal(r.selectors.length, 0);
});

test('changing projects uses the new route scope', () => {
  assert.equal(
    renderList({ cluster: 'host', namespace: 'project-a' }, 'cached').table.url,
    '/namespaces/project-a/secrets',
  );
  assert.equal(
    renderList({ cluster: 'host', namespace: 'project-b' }, 'cached').table.url,
    '/namespaces/project-b/secrets',
  );
});

test('cluster lists keep their namespace filter and all-project option', () => {
  const filtered = renderList({ cluster: 'host' }, 'selected-project');
  assert.equal(filtered.table.url, '/namespaces/selected-project/secrets');
  assert.equal(filtered.selectors[0].value, 'selected-project');
  const all = renderList({ cluster: 'host' }, null);
  assert.equal(all.table.url, '/secrets');
  assert.equal(all.selectors.length, 1);
});

test('custom URL factories receive the effective project namespace', () => {
  const r = renderList({ cluster: 'host', namespace: 'dev-wes' }, 'other', {
    getTableUrl: (ns: string) => `/custom/${ns}`,
  });
  assert.equal(r.table.url, '/custom/dev-wes');
});

test('explicit table URLs are retained', () => {
  assert.equal(
    renderList({ cluster: 'host', namespace: 'dev-wes' }, null, {
      table: { url: '/explicit', columns: [] },
    }).table.url,
    '/explicit',
  );
});
