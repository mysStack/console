const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const source = readFileSync(
  require('node:path').join(__dirname, 'public/nativeConsoleV3Bridge.js'),
  'utf8',
);
function fixture(owned = true) {
  const callbacks = {};
  const calls = [];
  const document = {};
  const bridge = {
    props: { actions: true, name: 'consolev3' },
    ownsFrame: () => owned,
    attach: () => calls.push(['attach']),
    markReady: () => true,
    resetDocument: () => calls.push(['reset']),
    routeAccepted: () => false,
    listeners: [],
    bus: {
      $on: (...args) => calls.push(['on', ...args]),
      $off: (...args) => calls.push(['off', ...args]),
      $emit: (...args) => calls.push(['emit', ...args]),
    },
  };
  const window = {
    parent: { __consoleV3NativeBridge: bridge },
    document,
    addEventListener: (name, fn) => {
      callbacks[name] = fn;
    },
    __WUJIE_MOUNT: () => calls.push(['mount']),
  };
  vm.runInNewContext(source, { window });
  return { window, bridge, callbacks, calls };
}
test('only the frame owned by the console receives the native bridge', () => {
  const f = fixture(false);
  assert.equal(f.window.$wujie, undefined);
  assert.equal(f.calls.length, 0);
});
test('the child mounts once its normal bundle has defined the mount hook', () => {
  const f = fixture();
  assert.equal(f.window.__POWERED_BY_WUJIE__, true);
  f.callbacks.DOMContentLoaded();
  assert.equal(f.calls.filter(x => x[0] === 'mount').length, 1);
});
test('the bridge filters stale routes and tracks child event listeners', () => {
  const f = fixture();
  const listener = () => {};
  f.window.$wujie.bus.$on('triggerAction', listener);
  assert.equal(f.bridge.listeners.length, 1);
  f.window.$wujie.bus.$emit('subRouteChange', 'consolev3', { pathname: '/old' });
  assert.equal(f.calls.filter(x => x[0] === 'emit').length, 0);
  f.window.$wujie.bus.$emit('loadCompleted', 'consolev3');
  assert.equal(f.calls.filter(x => x[0] === 'emit').length, 1);
});
test('a real child reload resets readiness and its document listeners', () => {
  const f = fixture();
  f.callbacks.pagehide();
  assert.equal(f.calls.filter(x => x[0] === 'reset').length, 1);
});

test('unsubscribing releases child handlers and keeps chained subscriptions tracked', () => {
  const f = fixture();
  const first = () => {};
  const second = () => {};
  const bus = f.window.$wujie.bus;
  assert.equal(bus.$on('first', first), bus);
  bus.$on('first', first);
  assert.equal(f.bridge.listeners.length, 1);
  bus.$on('second', second).$off('first', first);
  assert.deepEqual(
    f.bridge.listeners.map(item => item[0]),
    ['second'],
  );
  assert.equal(f.calls.filter(item => item[0] === 'off').length, 1);
});

test('clearing child subscriptions preserves host subscriptions', () => {
  const f = fixture();
  const first = () => {};
  const second = () => {};
  f.bridge.bus.$clear = () => {
    throw Error('The shared host bus must keep its listeners');
  };
  f.window.$wujie.bus.$on('first', first);
  f.window.$wujie.bus.$on('second', second);
  assert.equal(f.window.$wujie.bus.$clear(), f.window.$wujie.bus);
  assert.equal(f.bridge.listeners.length, 0);
  assert.deepEqual(
    f.calls.filter(item => item[0] === 'off').map(item => item[1]),
    ['first', 'second'],
  );
});

test('once and all-event helpers use the tracked child subscription methods', () => {
  const f = fixture();
  f.bridge.bus.$once = function (event, handler) {
    const once = (...args) => {
      this.$off(event, once);
      handler(...args);
    };
    this.$on(event, once);
  };
  f.bridge.bus.$onAll = function (handler) {
    return this.$on('*', handler);
  };
  f.bridge.bus.$offAll = function (handler) {
    return this.$off('*', handler);
  };
  const handler = () => {};
  const bus = f.window.$wujie.bus;
  bus.$once('once', handler);
  assert.equal(f.bridge.listeners.length, 1);
  const once = f.bridge.listeners[0][1];
  once();
  assert.equal(f.bridge.listeners.length, 0);
  assert.equal(bus.$onAll(handler), bus);
  assert.equal(f.bridge.listeners.length, 1);
  bus.$offAll(handler);
  assert.equal(f.bridge.listeners.length, 0);
});
