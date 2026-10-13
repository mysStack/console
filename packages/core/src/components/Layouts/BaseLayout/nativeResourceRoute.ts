const NATIVE_PROJECT_RESOURCE_DETAIL =
  /(\/projects\/[^/]+\/(?:configmaps|secrets)\/[^/]+)(?=$|[?#])/;

export function normalizeNativeResourceDetailPath(pathname: string): string {
  const match = pathname.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return pathname;
  return `${match[1].replace(NATIVE_PROJECT_RESOURCE_DETAIL, '$1/detail')}${match[2] || ''}`;
}
