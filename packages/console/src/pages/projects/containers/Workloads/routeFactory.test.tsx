import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { createNativeWorkloadRoutes } from './routeFactory';
import type { WorkloadKind } from '../../components/WorkloadForm/types';

function NativePage({ kind, mode }: { kind: WorkloadKind; mode?: 'create' | 'edit' }) {
  const label = kind === 'deployments' ? 'Deployment' : kind;
  return (
    <h1>
      {mode === 'create' ? '创建' : '编辑'} {label}
    </h1>
  );
}

test('renders the actual native create route without a Wujie application element', () => {
  const routes = createNativeWorkloadRoutes(
    NativePage,
    NativePage,
    '/dev/clusters/host/projects/demo',
  );
  const output = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dev/clusters/host/projects/demo/deployments/new']}>
      <Routes>
        {routes.map(route => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  );

  assert.match(output, /创建 Deployment/);
  assert.doesNotMatch(output, /<wujie-app/i);
});
