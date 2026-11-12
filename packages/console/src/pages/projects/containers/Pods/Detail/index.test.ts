import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Module from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';

function renderPodDetail() {
  let props: any;
  const events: string[] = [];
  const stubs: Record<string, any> = {
    'react-router-dom': { useParams: () => ({ podName: 'test-pod' }) },
    '@ks-console/shared': {
      useCacheStore: () => ['//ks.test/consolev3/ws/clusters/host/projects/ns'],
    },
    '../../../../../components/ConsoleV3AliveEmbed': {
      __esModule: true,
      default: (value: any) => {
        props = value;
        return null;
      },
    },
    '../../../components/ContainerLogBridge/useV3ContainerLogBridge': {
      useV3ContainerLogBridge: () => ({
        bindContainerLog: () => {
          events.push('bind');
          return () => events.push('unbind');
        },
        modal: null,
      }),
    },
  };
  const file = require.resolve('./index.tsx');
  const saved = new Map<string, any>();
  const resolveFilename = (Module as any)._resolveFilename;
  const sharedSource = require.resolve('@ks-console/shared/src/index.ts');
  try {
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
    const PodDetail = require('./index.tsx').default;
    renderToStaticMarkup(React.createElement(PodDetail));
    return { props, events };
  } finally {
    (Module as any)._resolveFilename = resolveFilename;
    delete require.cache[file];
    for (const [id, value] of saved) {
      if (value) require.cache[id] = value;
      else delete require.cache[id];
    }
  }
}

test('activating a reused Pod detail binds its native container log action', () => {
  const { props, events } = renderPodDetail();
  assert.equal(props.url, '//ks.test/consolev3/ws/clusters/host/projects/ns/pods/test-pod');
  assert.equal(typeof props.activated, 'function');
  props.activated({});
  assert.deepEqual(events, ['bind']);
  props.afterUnmount();
  assert.deepEqual(events, ['bind', 'unbind']);
});

test('reactivating a Pod detail replaces its listener and cleanup is idempotent', () => {
  const { props, events } = renderPodDetail();
  props.afterMount({});
  assert.equal(typeof props.activated, 'function');
  props.activated({});
  props.afterUnmount();
  props.afterUnmount();
  assert.deepEqual(events, ['bind', 'unbind', 'bind', 'unbind']);
});
