/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

export interface NativeConsoleV3Route {
  incomingPath?: string;
  currentPath: string;
  expectedPath: string;
  visible: boolean;
  suppressed: boolean;
}

export function canonicalConsoleV3Path(path: string): string {
  return path.replace(/^\/consolev3(?=\/)/, '').replace(/\/$/, '');
}

export function acceptsNativeConsoleV3Route({
  incomingPath,
  currentPath,
  expectedPath,
  visible,
  suppressed,
}: NativeConsoleV3Route): boolean {
  if (!visible || suppressed || typeof incomingPath !== 'string') return false;
  const incoming = canonicalConsoleV3Path(incomingPath);
  const current = canonicalConsoleV3Path(currentPath);
  const expected = canonicalConsoleV3Path(expectedPath);
  if (incoming !== current) return false;
  return !expected || incoming === expected || incoming.startsWith(expected + '/');
}
