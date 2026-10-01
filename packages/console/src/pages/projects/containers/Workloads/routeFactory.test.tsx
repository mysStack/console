import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import Module from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { KubedConfigProvider } from '@kubed/components';

import { createNativeWorkloadRoutes } from './routeFactory';

test('renders the actual native create route without a Wujie application element', () => {
  const moduleResolver = Module as unknown as {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const resolveFilename = moduleResolver._resolveFilename;
  moduleResolver._resolveFilename = (request, parent, isMain, options) =>
    request === '@ks-console/shared'
      ? path.resolve(__dirname, 'workloadShared.testDouble.ts')
      : resolveFilename(request, parent, isMain, options);
  const WorkloadCreate = require('./Create').default;
  const WorkloadEdit = require('./Edit').default;
  moduleResolver._resolveFilename = resolveFilename;
  const routes = createNativeWorkloadRoutes(
    WorkloadCreate,
    WorkloadEdit,
    '/dev/clusters/host/projects/demo',
  );
  const output = renderToStaticMarkup(
    <KubedConfigProvider>
      <MemoryRouter initialEntries={['/dev/clusters/host/projects/demo/deployments/new']}>
        <Routes>
          {routes.map(route => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </KubedConfigProvider>,
  );

  assert.match(output, /创建 Deployment/);
  assert.doesNotMatch(output, /<wujie-app/i);
});
