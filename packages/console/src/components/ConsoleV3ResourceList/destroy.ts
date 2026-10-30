/*
 * Please refer to the LICENSE file in the root of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import type { ConsoleV3SandboxLike } from './metrics';

/**
 * Destroy the shared app after its own unmount has finished.
 *
 * Wujie 1.0.25 `destroy()` calls the asynchronous `unmount()` without awaiting
 * it and then nulls the sandbox fields. The unmount continuation then reads
 * `element._cacheListeners` on the nulled document, and the host page reports
 * an unhandled rejection on every teardown that has a child unmount hook.
 * Running the unmount first makes wujie's internal call return early, so the
 * teardown stays ordered.
 */
export const destroyConsoleV3Instance = async (
  sandbox: ConsoleV3SandboxLike | undefined,
  destroyApp: () => void,
): Promise<void> => {
  try {
    await sandbox?.unmount?.();
  } catch {
    // The app must still leave wujie's cache when its unmount fails.
  }
  destroyApp();
};
