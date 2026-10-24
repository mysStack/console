export function getWorkloadDetailErrorPath(error: unknown): string | undefined {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 403) {
    return '/errors/403';
  }

  if (status === 404) {
    return '/404';
  }

  return undefined;
}
