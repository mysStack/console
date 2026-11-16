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
