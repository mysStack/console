import assert from 'node:assert/strict';
import test from 'node:test';
import Module from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('the Deployment entry opens a standalone document for the current project', () => {
  let button: any;
  let resource: any;
  const destinations: string[] = [];
  const stubs: Record<string, any> = {
    '@ks-console/shared': {
      useCacheStore: () => ['//ks.test/consolev3/ws/clusters/host/projects/project-a'],
    },
    '@kubed/components': {
      Button: (props: any) => {
        button = props;
        return null;
      },
    },
    '../../../../components/ConsoleV3ResourceList': {
      __esModule: true,
      default: (props: any) => {
        resource = props;
        return null;
      },
    },
  };
  const file = require.resolve('./index.tsx');
  const saved = new Map<string, any>();
  const resolveFilename = (Module as any)._resolveFilename;
  const sharedSource = require.resolve('@ks-console/shared/src/index.ts');
  const previousWindow = (globalThis as any).window;
  const previousT = (globalThis as any).t;
  try {
    (globalThis as any).window = {
      location: { host: 'ks.test', assign: (url: string) => destinations.push(url) },
    };
    (globalThis as any).t = (key: string) => key;
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
    const Deployments = require('./index.tsx').default;
    renderToStaticMarkup(React.createElement(Deployments));
    assert.equal(typeof button?.onClick, 'function');
    button.onClick();
    assert.deepEqual(destinations, [
      '//ks.test/consolev3/ws/clusters/host/projects/project-a/deployments',
    ]);
    assert.equal(resource.resource, 'deployments');
    assert.equal(
      resource.url,
      '//ks.test/consolev3/ws/clusters/host/projects/project-a/deployments',
    );
  } finally {
    (globalThis as any).window = previousWindow;
    (globalThis as any).t = previousT;
    (Module as any)._resolveFilename = resolveFilename;
    delete require.cache[file];
    for (const [id, value] of saved) {
      if (value) require.cache[id] = value;
      else delete require.cache[id];
    }
  }
});
