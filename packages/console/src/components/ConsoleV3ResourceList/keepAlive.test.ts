import assert from 'node:assert';
import test from 'node:test';

import {
  keepConsoleV3SandboxAlive,
  pruneConsoleV3Templates,
  scheduleConsoleV3ActivationRoute,
  watchConsoleV3Sandbox,
} from './keepAlive';

const body = { id: 'body' };
const removed: string[] = [];

const template = (canonical: boolean, removedList: string[] = removed) => ({
  tagName: 'HTML',
  contains: (node: unknown) => canonical && node === body,
  remove: () => removedList.push(canonical ? 'canonical' : 'shell'),
});

test('keeping the shared sandbox alive only flips the flag', () => {
  assert.equal(keepConsoleV3SandboxAlive(undefined), false);
  assert.equal(keepConsoleV3SandboxAlive({}), true);
  assert.equal(keepConsoleV3SandboxAlive({ alive: true }), true);
});

test('drops the template shell that lost the live body', () => {
  const calls: string[] = [];
  const shadowRoot = {
    childElementCount: 2,
    body,
    children: [template(false, calls), template(true, calls)],
  };

  assert.equal(pruneConsoleV3Templates(shadowRoot), 1);
  assert.deepEqual(calls, ['shell']);
});

test('keeps a single template and ignores non-template children', () => {
  const calls: string[] = [];
  const shadowRoot = {
    childElementCount: 2,
    body,
    children: [
      template(true, calls),
      { tagName: 'DIV', contains: () => false, remove: () => calls.push('div') },
    ],
  };

  assert.equal(pruneConsoleV3Templates(shadowRoot), 0);
  assert.deepEqual(calls, []);
});

test('never prunes before Wujie moved a body into the templates', () => {
  const calls: string[] = [];
  const shadowRoot = {
    childElementCount: 2,
    body: undefined,
    children: [template(false, calls), template(false, calls)],
  };

  assert.equal(pruneConsoleV3Templates(shadowRoot), 0);
  assert.deepEqual(calls, []);
});

test('watches a shadow root once and guards it immediately', () => {
  const callbacks: Array<() => void> = [];
  const observed: unknown[] = [];
  const FakeObserver = class {
    constructor(callback: () => void) {
      callbacks.push(callback);
    }
    observe(target: unknown) {
      observed.push(target);
    }
  } as unknown as typeof MutationObserver;
  const calls: string[] = [];
  const shadowRoot = {
    childElementCount: 2,
    body,
    children: [template(false, calls), template(true, calls)],
  };
  const sandbox = { alive: false, shadowRoot };

  assert.equal(watchConsoleV3Sandbox(sandbox, FakeObserver), true);
  assert.equal(sandbox.alive, true);
  assert.deepEqual(calls, ['shell']);
  assert.equal(watchConsoleV3Sandbox(sandbox, FakeObserver), false);
  assert.equal(observed.length, 1);

  sandbox.alive = false;
  callbacks[0]();
  assert.equal(sandbox.alive, true);
});

test('a rebuilt sandbox gets its own watcher', () => {
  const FakeObserver = class {
    observe() {}
  } as unknown as typeof MutationObserver;
  const shadowRoot = { childElementCount: 1, body, children: [template(true)] };

  assert.equal(watchConsoleV3Sandbox({ alive: true, shadowRoot }, FakeObserver), true);
  assert.equal(watchConsoleV3Sandbox({ alive: true, shadowRoot }, FakeObserver), false);
});

const childWindow = (pathname: string) => {
  const replaced: string[] = [];
  const events: string[] = [];
  return {
    replaced,
    events,
    window: {
      location: { pathname, search: '', hash: '' },
      history: { state: null, replaceState: (_state, _title, url) => replaced.push(String(url)) },
      dispatchEvent: event => events.push(event.type),
      requestAnimationFrame: callback => {
        callback(0);
        return 0;
      },
    },
  };
};

test('moves a kept-alive child router to the activating route', () => {
  const child = childWindow('/consolev3/clusters/host/pods');
  const sandbox = {
    url: '//ks.test:30881/consolev3/clusters/host/deployments',
    iframe: { contentWindow: child.window },
  };

  assert.equal(scheduleConsoleV3ActivationRoute(sandbox), true);
  assert.deepEqual(child.replaced, ['/consolev3/clusters/host/deployments']);
  assert.deepEqual(child.events, ['popstate']);
});

test('leaves a child router that already sits on the activating route alone', () => {
  const child = childWindow('/consolev3/clusters/host/pods');
  const sandbox = {
    url: '//ks.test:30881/consolev3/clusters/host/pods',
    iframe: { contentWindow: child.window },
  };

  assert.equal(scheduleConsoleV3ActivationRoute(sandbox), true);
  assert.deepEqual(child.replaced, []);
  assert.deepEqual(child.events, []);
});

test('cannot route a sandbox without a child window', () => {
  assert.equal(scheduleConsoleV3ActivationRoute(undefined), false);
  assert.equal(scheduleConsoleV3ActivationRoute({ url: '//ks.test/consolev3/pods' }), false);
});

test('a new template routes the app; pruning a shell does not', () => {
  const callbacks: Array<(records: MutationRecord[]) => void> = [];
  const FakeObserver = class {
    constructor(callback: (records: MutationRecord[]) => void) {
      callbacks.push(callback);
    }
    observe() {}
  } as unknown as typeof MutationObserver;
  const child = childWindow('/consolev3/clusters/host/pods');
  const shadowRoot = { childElementCount: 1, body, children: [template(true)] };
  const sandbox = {
    alive: true,
    url: '//ks.test:30881/consolev3/clusters/host/deployments',
    iframe: { contentWindow: child.window },
    shadowRoot,
  };

  watchConsoleV3Sandbox(sandbox, FakeObserver);
  callbacks[0]([{ addedNodes: [{}] } as unknown as MutationRecord]);
  assert.deepEqual(child.events, ['popstate']);

  callbacks[0]([{ addedNodes: [], removedNodes: [{}] } as unknown as MutationRecord]);
  assert.deepEqual(child.events, ['popstate']);
});
