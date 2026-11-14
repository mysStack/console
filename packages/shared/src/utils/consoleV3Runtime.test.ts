import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createConsoleV3Runtime,
  findConsoleV3Window,
  isConsoleV3PageMounted,
} from './consoleV3Runtime';

function documentFixture(child: any, connected = true, hidden = false) {
  const app = connected ? { closest: () => (hidden ? {} : null) } : null;
  return {
    querySelectorAll: () => [
      { contentWindow: { __WUJIE: { id: 'consolev3_tool' } } },
      { contentWindow: child },
    ],
    querySelector: () => app,
  } as unknown as Document;
}

test('ready handles belong to the exact current page sandbox and reset on a new boot', () => {
  const runtime = createConsoleV3Runtime();
  const first = { __WUJIE: { id: 'consolev3' } } as any;
  const next = { __WUJIE: { id: 'consolev3' } } as any;
  const doc = documentFixture(first);
  assert.equal(findConsoleV3Window(doc), first);
  assert.equal(runtime.getReadyWindow(doc), undefined);
  runtime.markReady(first);
  assert.equal(runtime.getReadyWindow(doc), first);
  assert.equal(runtime.getReadyWindow(documentFixture(next)), undefined);
  runtime.reset();
  assert.equal(runtime.getReadyWindow(doc), undefined);
});

test('ready subscriptions are removable and do not retain a disposed action owner', () => {
  const runtime = createConsoleV3Runtime();
  let notifications = 0;
  const remove = runtime.subscribe(() => notifications++);
  runtime.markReady({} as Window);
  assert.equal(notifications, 1);
  remove();
  runtime.markReady({} as Window);
  assert.equal(notifications, 1);
});

test('only a visible page host can navigate the parent console', () => {
  const child = { __WUJIE: { id: 'consolev3' } } as any;
  assert.equal(isConsoleV3PageMounted(documentFixture(child)), true);
  assert.equal(isConsoleV3PageMounted(documentFixture(child, false)), false);
  assert.equal(isConsoleV3PageMounted(documentFixture(child, true, true)), false);
});
