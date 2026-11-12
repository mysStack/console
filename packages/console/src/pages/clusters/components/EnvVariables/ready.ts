export function isWorkloadEnvDetailReady(detail: unknown): detail is Record<string, any> {
  return Boolean(detail && typeof detail === 'object' && Object.keys(detail).length > 0);
}
