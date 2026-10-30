import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONSOLE_V3_BOOT_FAIL_MS,
  getConsoleV3BootPhase,
  isConsoleV3BootInFlight,
  markConsoleV3BootFailed,
  markConsoleV3BootMounted,
  markConsoleV3BootStarted,
  resetConsoleV3BootPhase,
} from './bootPhase';

test('boot starts as idle and is not in flight', () => {
  resetConsoleV3BootPhase();
  assert.equal(getConsoleV3BootPhase(), 'idle');
  assert.equal(isConsoleV3BootInFlight(), false);
});

test('markConsoleV3BootStarted enters booting and shields destroy', () => {
  resetConsoleV3BootPhase();
  const timers: Array<() => void> = [];
  markConsoleV3BootStarted(
    cb => {
      timers.push(cb);
      return timers.length as unknown as ReturnType<typeof setTimeout>;
    },
    () => undefined,
  );
  assert.equal(getConsoleV3BootPhase(), 'booting');
  assert.equal(isConsoleV3BootInFlight(), true);
  assert.equal(timers.length, 1);
});

test('afterMount/activated settle clears in-flight without waiting for the watchdog', () => {
  resetConsoleV3BootPhase();
  let cleared = 0;
  markConsoleV3BootStarted(
    () => 1 as unknown as ReturnType<typeof setTimeout>,
    () => {
      cleared += 1;
    },
  );
  markConsoleV3BootMounted(() => {
    cleared += 1;
  });
  assert.equal(getConsoleV3BootPhase(), 'mounted');
  assert.equal(isConsoleV3BootInFlight(), false);
  assert.ok(cleared >= 1);
});

test('watchdog only fails the generation still stuck in booting', () => {
  resetConsoleV3BootPhase();
  const callbacks: Array<() => void> = [];
  const gen1 = markConsoleV3BootStarted(cb => {
    callbacks.push(cb);
    return callbacks.length as unknown as ReturnType<typeof setTimeout>;
  });
  markConsoleV3BootStarted(cb => {
    callbacks.push(cb);
    return callbacks.length as unknown as ReturnType<typeof setTimeout>;
  });
  // Fire the first watchdog: newer boot must ignore it.
  callbacks[0]();
  assert.equal(getConsoleV3BootPhase(), 'booting');
  assert.notEqual(gen1, 0);
  callbacks[1]();
  assert.equal(getConsoleV3BootPhase(), 'failed');
  assert.equal(isConsoleV3BootInFlight(), false);
});

test('explicit failed ends in-flight protection so verify may rebuild', () => {
  resetConsoleV3BootPhase();
  markConsoleV3BootStarted();
  markConsoleV3BootFailed();
  assert.equal(getConsoleV3BootPhase(), 'failed');
  assert.equal(isConsoleV3BootInFlight(), false);
});

test('fail watchdog delay stays far above a normal cold start', () => {
  assert.ok(CONSOLE_V3_BOOT_FAIL_MS >= 60_000);
});
