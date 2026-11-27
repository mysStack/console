import { syncConsoleV3ListRoute } from '../../../../../components/ConsoleV3ResourceList/route';

interface EmbeddedDetailRoute {
  host: string;
  pathname: string;
  search: string;
  hash: string;
}

export function getConsoleV3DetailUrl({
  host,
  pathname,
  search,
  hash,
}: EmbeddedDetailRoute): string {
  return `//${host}/consolev3${pathname}${search}${hash}`;
}

export function bindConsoleV3DetailHistory(
  hostWindow: Window,
  appWindow: Window,
  hostDetailPath: string,
): () => void {
  const followHistory = () => {
    const { pathname, search, hash } = hostWindow.location;
    if (pathname !== hostDetailPath && !pathname.startsWith(`${hostDetailPath}/`)) {
      return;
    }
    syncConsoleV3ListRoute(appWindow, `/consolev3${pathname}${search || ''}${hash || ''}`);
  };
  hostWindow.addEventListener('popstate', followHistory);
  return () => hostWindow.removeEventListener('popstate', followHistory);
}
