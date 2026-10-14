import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindConsoleV3DetailHistory,
  getConsoleV3DetailPath,
  getConsoleV3DetailUrl,
  getConsoleV3DeploymentListPath,
  getConsoleV3ProjectPrefix,
  replaceConsoleV3Route,
  replaceConsoleV3RouteSilently,
  shouldSyncConsoleV3DetailRoute,
} from './route';

test('replaces a reused child route without notifying the host router', () => {
  const events: Event[] = [];
  const child = Object.assign(new EventTarget(), {
    location: { pathname: '/consolev3/dashboard' },
    history: {
      state: { key: 'keep-state' },
      replaceState(state: unknown, title: string, path: string) {
        assert.deepEqual(state, { key: 'keep-state' });
        assert.equal(title, '');
        child.location.pathname = path;
      },
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  });
  replaceConsoleV3RouteSilently(child as unknown as Window, '/consolev3/projects/wes/deployments');
  assert.equal(child.location.pathname, '/consolev3/projects/wes/deployments');
  assert.equal(events.length, 0);
});

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
    '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes/deployments',
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

test('forwards host back/forward only within the mounted workload and stops after cleanup', t => {
  class NativePopStateEvent extends Event {
    state: unknown;
    constructor(type: string, init: { state: unknown }) {
      super(type);
      this.state = init.state;
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'PopStateEvent');
  Object.defineProperty(globalThis, 'PopStateEvent', {
    configurable: true,
    value: NativePopStateEvent,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'PopStateEvent', original);
    else Reflect.deleteProperty(globalThis, 'PopStateEvent');
  });
  const detail = '/test-workspace/clusters/host/projects/test-wes/deployments/ams-server';
  const host = Object.assign(new EventTarget(), { location: { pathname: `${detail}/env` } });
  const child = Object.assign(new EventTarget(), {
    location: { pathname: `/consolev3${detail}/env` },
    history: {
      state: { key: 'keep-native-state' },
      replaceState(state: unknown, title: string, path: string) {
        assert.deepEqual(state, { key: 'keep-native-state' });
        assert.equal(title, '');
        child.location.pathname = path;
      },
    },
  });
  let delivered = 0;
  child.addEventListener('popstate', event => {
    // V3's browser history ignores extraneous popstate events without state.
    if ((event as PopStateEvent).state !== undefined) delivered += 1;
  });
  const remove = bindConsoleV3DetailHistory(host as unknown as Window, child as unknown as Window, {
    hostDetailPath: detail,
    projectPrefix: '/test-workspace/clusters/host/projects/test-wes',
    name: 'ams-server',
  });
  host.location.pathname = `${detail}/metadata`;
  host.dispatchEvent(new Event('popstate'));
  assert.equal(child.location.pathname, `/consolev3${detail}/metadata`);
  assert.equal(delivered, 1);
  assert.deepEqual(child.history.state, { key: 'keep-native-state' });
  host.location.pathname = `${detail}/env`;
  host.dispatchEvent(new Event('popstate'));
  assert.equal(child.location.pathname, `/consolev3${detail}/env`);
  assert.equal(delivered, 2);
  host.dispatchEvent(new Event('popstate'));
  assert.equal(delivered, 2, 'same-route history events must not trigger a feedback loop');
  host.location.pathname = `${detail}-other/env`;
  host.dispatchEvent(new Event('popstate'));
  assert.equal(child.location.pathname, `/consolev3${detail}/env`);
  assert.equal(delivered, 2, 'a neighbouring workload belongs to its own mounted page');
  remove();
  host.location.pathname = `${detail}/events`;
  host.dispatchEvent(new Event('popstate'));
  assert.equal(child.location.pathname, `/consolev3${detail}/env`);
  assert.equal(delivered, 2);
});

test('replaces the child route and preserves history state when notifying the V3 router', t => {
  class NativePopStateEvent extends Event {
    state: unknown;
    constructor(type: string, init: { state: unknown }) {
      super(type);
      this.state = init.state;
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'PopStateEvent');
  Object.defineProperty(globalThis, 'PopStateEvent', {
    configurable: true,
    value: NativePopStateEvent,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'PopStateEvent', original);
    else Reflect.deleteProperty(globalThis, 'PopStateEvent');
  });
  const events: Event[] = [];
  const child = Object.assign(new EventTarget(), {
    location: { pathname: '/consolev3/dashboard' },
    history: {
      state: { key: 'keep-state' },
      replaceState(state: unknown, title: string, path: string) {
        assert.deepEqual(state, { key: 'keep-state' });
        assert.equal(title, '');
        child.location.pathname = path;
      },
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  });
  replaceConsoleV3Route(child as unknown as Window, '/consolev3/projects/wes/deployments');
  assert.equal(child.location.pathname, '/consolev3/projects/wes/deployments');
  assert.equal(events.length, 1);
  assert.deepEqual((events[0] as PopStateEvent).state, { key: 'keep-state' });
});

test('syncs the detail route after the V3 app boots at the workload list', () => {
  const listPath = getConsoleV3DeploymentListPath(
    '/test-workspace/clusters/host/projects/test-wes',
  );
  assert.equal(
    shouldSyncConsoleV3DetailRoute(
      listPath,
      '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
      listPath,
    ),
    true,
  );
  assert.equal(
    shouldSyncConsoleV3DetailRoute(
      '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
      '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
      listPath,
    ),
    false,
  );
  assert.equal(
    shouldSyncConsoleV3DetailRoute(
      '/consolev3/dashboard',
      '/consolev3/test-workspace/clusters/host/projects/test-wes/deployments/ams-server',
      listPath,
    ),
    false,
    'a stale preloaded dashboard must not receive a deep detail route',
  );
});
