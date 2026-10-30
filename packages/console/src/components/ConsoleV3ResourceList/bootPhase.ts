/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Explicit boot phase for the shared consolev3 sandbox.
 *
 * The previous wall-clock grace (`CONSOLE_V3_BOOT_GRACE_MS`) treated "started
 * recently" as "still booting". An empty ShadowRoot during bundle load is
 * normal; destroying it mid-flight caused `null._cacheListeners`. Protection
 * must follow lifecycle, not a timer:
 *
 * - `booting`: host asked Wujie to start; do not destroy/rebuild.
 * - `mounted`: `afterMount` or `activated` settled the boot.
 * - `failed`: the boot never settled (watchdog) or was marked failed; verify
 *   may destroy and retry.
 *
 * The fail watchdog is only for hung boots. It is not a mid-flight shield and
 * must stay well above a normal cold start (~3 s).
 */

export type ConsoleV3BootPhase = 'idle' | 'booting' | 'mounted' | 'failed';

/** Hung-boot watchdog only — not used to end mid-flight protection early. */
export const CONSOLE_V3_BOOT_FAIL_MS = 60_000;

type TimerHandle = ReturnType<typeof setTimeout>;

let phase: ConsoleV3BootPhase = 'idle';
let generation = 0;
let failTimer: TimerHandle | undefined;

export type BootTimerSchedule = (callback: () => void, ms: number) => TimerHandle;
export type BootTimerClear = (handle: TimerHandle) => void;

const defaultSchedule: BootTimerSchedule =
  typeof setTimeout === 'undefined' ? () => 0 as unknown as TimerHandle : setTimeout;
const defaultClear: BootTimerClear =
  typeof clearTimeout === 'undefined' ? () => undefined : clearTimeout;

const clearFailTimer = (clear: BootTimerClear = defaultClear): void => {
  if (failTimer === undefined) return;
  clear(failTimer);
  failTimer = undefined;
};

export const getConsoleV3BootPhase = (): ConsoleV3BootPhase => phase;

/** True only while a host-started boot has not yet mounted or failed. */
export const isConsoleV3BootInFlight = (): boolean => phase === 'booting';

/**
 * Mark that the host is starting (or restarting) the shared app.
 * Returns the boot generation so tests can assert watchdog scoping.
 */
export const markConsoleV3BootStarted = (
  schedule: BootTimerSchedule = defaultSchedule,
  clear: BootTimerClear = defaultClear,
  failAfterMs: number = CONSOLE_V3_BOOT_FAIL_MS,
): number => {
  generation += 1;
  const gen = generation;
  phase = 'booting';
  clearFailTimer(clear);
  failTimer = schedule(() => {
    if (generation === gen && phase === 'booting') {
      phase = 'failed';
      failTimer = undefined;
    }
  }, failAfterMs);
  return gen;
};

/** Lifecycle settled: afterMount or activated. */
export const markConsoleV3BootMounted = (clear: BootTimerClear = defaultClear): void => {
  clearFailTimer(clear);
  phase = 'mounted';
};

export const markConsoleV3BootFailed = (clear: BootTimerClear = defaultClear): void => {
  clearFailTimer(clear);
  phase = 'failed';
};

/** Test helper — reset module state between cases. */
export const resetConsoleV3BootPhase = (clear: BootTimerClear = defaultClear): void => {
  clearFailTimer(clear);
  phase = 'idle';
  generation = 0;
};
