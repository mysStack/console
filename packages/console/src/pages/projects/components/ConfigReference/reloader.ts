import type { ReloaderPolicy } from './types';

export const RELOADER_AUTO_ANNOTATION = 'reloader.stakater.com/auto';

export function readReloaderPolicy(annotations: Record<string, string> = {}): ReloaderPolicy {
  return { enabled: annotations[RELOADER_AUTO_ANNOTATION] === 'true' };
}

export function writeReloaderPolicy(
  annotations: Record<string, string> = {},
  enabled: boolean,
): Record<string, string> {
  const next = { ...annotations };
  if (enabled) {
    next[RELOADER_AUTO_ANNOTATION] = 'true';
  } else {
    delete next[RELOADER_AUTO_ANNOTATION];
  }
  return next;
}
