import assert from 'node:assert/strict';
import test from 'node:test';

import { scheduleConsoleV3ListRouteSync, syncConsoleV3ListRoute } from './route';

test('syncs an alive V3 app back to the requested list route', () => {
  const events: Event[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/project/configmaps/one/detail', search: '', hash: '' },
    history: {
      state: { keep: true },
      replaceState(_state: unknown, _title: string, url?: string | URL | null) {
        const parsed = new URL(String(url), 'http://localhost');
        appWindow.location.pathname = parsed.pathname;
        appWindow.location.search = parsed.search;
        appWindow.location.hash = parsed.hash;
      },
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(
    syncConsoleV3ListRoute(appWindow, '//example.test/consolev3/project/configmaps'),
    true,
  );
  assert.equal(appWindow.location.pathname, '/consolev3/project/configmaps');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'popstate');
  assert.equal(
    syncConsoleV3ListRoute(appWindow, '//example.test/consolev3/project/configmaps'),
    false,
  );
});

test('schedules route synchronization after the alive app has activated', () => {
  const callbacks: FrameRequestCallback[] = [];
  const events: Event[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/project/configmaps/one/detail', search: '', hash: '' },
    history: {
      state: null,
      replaceState() {
        appWindow.location.pathname = '/consolev3/project/configmaps';
      },
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      callbacks.push(callback);
      return callbacks.length;
    },
  };

  scheduleConsoleV3ListRouteSync(appWindow, '//example.test/consolev3/project/configmaps');
  assert.equal(callbacks.length, 1);
  callbacks.shift()?.(0);
  assert.equal(callbacks.length, 1);
  assert.equal(events.length, 0);
  callbacks.shift()?.(0);
  assert.equal(events.length, 1);
});
