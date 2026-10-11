import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getConsoleV3DetailPath,
  getConsoleV3DetailUrl,
  getConsoleV3ProjectPrefix,
  syncConsoleV3DetailRoute,
} from './route';

test('builds the project-relative Wujie route used by the preloaded V3 app', () => {
  assert.equal(
    getConsoleV3ProjectPrefix({
      workspace: 'test-workspace',
      cluster: 'host',
      namespace: 'test-wes',
    }),
    '/test-workspace/clusters/host/projects/test-wes',
  );
});

test('boots the cached V3 app at the stable workload root', () => {
  assert.equal(
    getConsoleV3DetailUrl({
      host: '192.168.2.131:30880',
      projectPrefix: '/test-workspace/clusters/host/projects/test-wes',
      name: 'ams-server',
    }),
    [
      '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes',
      '/deployments/ams-server',
    ].join(''),
  );
});

test('converts a direct host sub-route to the mounted V3 browser path', () => {
  assert.equal(
    getConsoleV3DetailPath({
      projectPrefix: '/test-workspace/clusters/host/projects/test-wes',
      name: 'ams-server',
      hostPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
      hostDetailPath: '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
    }),
    '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env',
  );
});

function mountedApp(pathname: string, ready = true) {
  const calls: string[] = [];
  const app = {
    location: { pathname },
    document: { getElementById: () => ({ hasChildNodes: () => ready }) },
    history: {
      state: { existing: true },
      replaceState: (state: unknown, _title: string, path: string) => {
        assert.deepEqual(state, { existing: true });
        calls.push(`replace:${path}`);
        app.location.pathname = path;
      },
      pushState: () =>
        assert.fail('host history navigation must not add an embedded history entry'),
    },
    dispatchEvent: (event: Event) => {
      calls.push(event.type);
      return true;
    },
  };
  return { app: app as unknown as Window, calls };
}

test('synchronizes browser back to the embedded tab without adding a history entry', () => {
  const original = globalThis.PopStateEvent;
  globalThis.PopStateEvent = class extends Event {} as typeof PopStateEvent;
  try {
    const { app, calls } = mountedApp('/consolev3/project/deployments/test/env');
    assert.equal(
      syncConsoleV3DetailRoute(app, '/consolev3/project/deployments/test/metadata'),
      true,
    );
    assert.deepEqual(calls, ['replace:/consolev3/project/deployments/test/metadata', 'popstate']);
  } finally {
    globalThis.PopStateEvent = original;
  }
});

test('does not echo an embedded tab click when both paths already match', () => {
  const { app, calls } = mountedApp('/consolev3/project/deployments/test/env');
  assert.equal(syncConsoleV3DetailRoute(app, app.location.pathname), false);
  assert.deepEqual(calls, []);
});

test('waits for the embedded root instead of navigating an unmounted cached app', () => {
  const { app, calls } = mountedApp('/consolev3/project/deployments/test', false);
  assert.equal(syncConsoleV3DetailRoute(app, '/consolev3/project/deployments/test/env'), false);
  assert.deepEqual(calls, []);
});
