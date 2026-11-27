import assert from 'node:assert/strict';
import test from 'node:test';

import { bindConsoleV3DetailHistory, getConsoleV3DetailUrl } from './route';

test('deployment detail uses the requested canonical route, including search and hash', () => {
  const pathname = '/dev-workspace/clusters/host/projects/dev-wms/deployments/example/events';
  assert.equal(
    getConsoleV3DetailUrl({
      host: 'example.test',
      pathname,
      search: '?filter=ready',
      hash: '#event',
    }),
    `//example.test/consolev3${pathname}?filter=ready#event`,
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
  const host = Object.assign(new EventTarget(), {
    location: { pathname: `${detail}/env`, search: '', hash: '' },
  });
  const child = Object.assign(new EventTarget(), {
    location: { pathname: `/consolev3${detail}/env`, search: '', hash: '' },
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
  const remove = bindConsoleV3DetailHistory(
    host as unknown as Window,
    child as unknown as Window,
    detail,
  );
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
