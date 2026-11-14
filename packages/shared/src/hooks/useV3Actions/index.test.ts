import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'index.tsx'));
function fixture(ready = true, mounted = true) {
  const component: any = function WujieReact() {};
  component.bus = { $emit: (...args: any[]) => events.push(args) };
  const child = {};
  const listeners = new Set<() => void>();
  const events: any[] = [];
  const cleanups: any[] = [];
  const hooks: any[] = [];
  const timers = new Map<number, () => void>();
  const lifecycle: any[] = [];
  let index = 0,
    first = true,
    timerId = 0,
    connected = mounted,
    isReady = ready;
  const location = {
    host: 'console.test',
    pathname: '/ws/clusters/host/projects/ns/deployments/app/resource-status',
    search: '',
  };
  const react = {
    createElement: (type: any, props: any, ...children: any[]) => ({
      type,
      props: props || {},
      children,
    }),
    Fragment: 'Fragment',
    useState(value: any) {
      const slot = index++;
      if (first) hooks[slot] = value;
      return [
        hooks[slot],
        (next: any) => {
          hooks[slot] = typeof next === 'function' ? next(hooks[slot]) : next;
        },
      ];
    },
    useRef(value: any) {
      const slot = index++;
      if (first) hooks[slot] = { current: value };
      return hooks[slot];
    },
    useEffect(effect: any) {
      index++;
      if (first) cleanups.push(effect());
    },
  };
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'index.tsx'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} as any };
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    globals: { consoleEntry: { singleV3: true } },
    t: (key: string) => key,
    document: { querySelector: () => (connected ? {} : null) },
    window: {
      location,
      setTimeout: (fn: any) => {
        timers.set(++timerId, fn);
        return timerId;
      },
      clearTimeout: (id: number) => timers.delete(id),
    },
    setTimeout: (fn: any) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout: (id: number) => timers.delete(id),
    require(id: string) {
      if (id === 'react') return react;
      if (id === 'wujie-react') return { default: component, __esModule: true };
      if (id === '@kubed/components')
        return {
          Loading: 'Loading',
          notify: { error: (...args: any[]) => events.push(['error', ...args]) },
        };
      if (id === '../../utils/consoleV3Runtime')
        return {
          consoleV3Runtime: {
            getReadyWindow: () => (isReady ? child : undefined),
            subscribe: (fn: () => void) => {
              listeners.add(fn);
              return () => listeners.delete(fn);
            },
          },
        };
      return requireFromSource(id);
    },
  });
  function render() {
    index = 0;
    const hook = loaded.exports.useV3action();
    first = false;
    return hook;
  }
  let hook = render();
  hook.render({ afterMount: (value: any) => lifecycle.push(value) });
  function nodes(node: any): any[] {
    return !node || typeof node !== 'object'
      ? []
      : [node, ...(node.children || []).flat(Infinity).flatMap(nodes)];
  }
  return {
    child,
    events,
    timers,
    lifecycle,
    location,
    open: (params: any) => hook.open(params),
    render: () => {
      hook = render();
      return nodes(hook.render({ afterMount: (value: any) => lifecycle.push(value) }));
    },
    ready: () => {
      isReady = true;
      for (const fn of listeners) fn();
    },
    attach: () => {
      connected = true;
    },
    dispose: () => cleanups.forEach(fn => fn?.()),
  };
}
const params = {
  action: 'workload.template.edit',
  v3Module: 'workload',
  v3StoreParams: 'deployments',
};

test('an already mounted ready page dispatches immediately and binds the caller to the same window', () => {
  const f = fixture();
  f.open(params);
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0][0], 'triggerAction');
  assert.equal(f.lifecycle[0], f.child);
  assert.equal(f.timers.size, 0);
});

test('a pure V4 page attaches the same alive runtime before opening its modal', () => {
  const f = fixture(true, false);
  f.open(params);
  assert.equal(f.events.length, 0);
  const app = f.render().find(node => node.type?.name === 'WujieReact');
  assert.equal(app.props.name, 'consolev3');
  assert.equal(app.props.alive, true);
  f.attach();
  app.props.activated(f.child);
  assert.equal(f.events.filter(e => e[0] === 'triggerAction').length, 1);
});

test('pending initialization queues one action and ignores repeated clicks until it is ready', () => {
  const f = fixture(false);
  f.open(params);
  f.open({ ...params, action: 'duplicate' });
  assert.equal(f.events.length, 0);
  f.ready();
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0][1], params.action);
});

test('scope changes and unmounted owners cannot dispatch delayed actions', () => {
  const changed = fixture(false);
  let cancelled = 0;
  changed.open({ ...params, onCancel: () => cancelled++ });
  changed.location.pathname = '/clusters/other';
  changed.ready();
  assert.equal(changed.events.length, 0);
  assert.equal(cancelled, 1);
  const disposed = fixture(false);
  disposed.open(params);
  disposed.dispose();
  disposed.ready();
  assert.equal(disposed.events.length, 0);
  assert.equal(disposed.timers.size, 0);
});

test('an initialization timeout releases the draft owner and reports failure once', () => {
  const f = fixture(false);
  let cancelled = 0;
  f.open({ ...params, onCancel: () => cancelled++ });
  [...f.timers.values()][0]();
  assert.equal(cancelled, 1);
  assert.equal(f.events[0][0], 'error');
  f.ready();
  assert.equal(f.events.filter(e => e[0] === 'triggerAction').length, 0);
});
