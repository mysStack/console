import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notifyConsoleV3ActivationRoute,
  scheduleConsoleV3ListRouteSync,
  scheduleConsoleV3RouteNotification,
  syncConsoleV3ListRoute,
} from './route';

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

test('notifies a kept-alive router whose location Wujie already moved', () => {
  const events: Event[] = [];
  const replaced: string[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/clusters/host/deployments', search: '', hash: '' },
    history: {
      state: null,
      replaceState: (_s: unknown, _t: string, url?: string) => replaced.push(String(url)),
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(
    notifyConsoleV3ActivationRoute(appWindow, '//example.test/consolev3/clusters/host/deployments'),
    false,
  );
  assert.deepEqual(replaced, []);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'popstate');
});

test('can skip popstate when the child already sits on the target route', () => {
  const events: Event[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/clusters/host/deployments', search: '', hash: '' },
    history: { state: null, replaceState() {} },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(
    notifyConsoleV3ActivationRoute(
      appWindow,
      '//example.test/consolev3/clusters/host/deployments',
      { notifyIfUnchanged: false },
    ),
    false,
  );
  assert.equal(events.length, 0);
});

test('moves and notifies when the child router still sits on the old route', () => {
  const events: Event[] = [];
  const replaced: string[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/clusters/host/pods', search: '', hash: '' },
    history: {
      state: null,
      replaceState: (_s: unknown, _t: string, url?: string) => replaced.push(String(url)),
    },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(
    notifyConsoleV3ActivationRoute(appWindow, '//example.test/consolev3/clusters/host/deployments'),
    true,
  );
  assert.deepEqual(replaced, ['/consolev3/clusters/host/deployments']);
  assert.equal(events.length, 1);
});

test('schedules the activation notification after two frames', () => {
  const callbacks: FrameRequestCallback[] = [];
  const events: Event[] = [];
  const appWindow = {
    location: { pathname: '/consolev3/clusters/host/deployments', search: '', hash: '' },
    history: { state: null, replaceState() {} },
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      callbacks.push(callback);
      return callbacks.length;
    },
  };

  scheduleConsoleV3RouteNotification(
    appWindow,
    '//example.test/consolev3/clusters/host/deployments',
  );
  assert.equal(callbacks.length, 1);
  callbacks.shift()?.(0);
  assert.equal(events.length, 0);
  callbacks.shift()?.(0);
  assert.equal(events.length, 1);
});
