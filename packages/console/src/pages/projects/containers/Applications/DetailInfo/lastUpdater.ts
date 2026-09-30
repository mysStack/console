export function getLastUpdater(detail?: {
  metadata?: { annotations?: Record<string, string> };
}): string {
  return detail?.metadata?.annotations?.['kubesphere.io/last-updater'] || '';
}
