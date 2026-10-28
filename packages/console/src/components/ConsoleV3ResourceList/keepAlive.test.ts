import assert from 'node:assert';
import test from 'node:test';

import {
  keepConsoleV3SandboxAlive,
  pruneConsoleV3Templates,
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
