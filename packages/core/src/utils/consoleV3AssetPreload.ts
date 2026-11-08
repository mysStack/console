/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Host-side preload of the V3 main entry assets on list landings.
 *
 * `preloadApp(consolev3)` still waits on the BFF HTML before the child document
 * discovers `<script>` / `<link>` tags. Starting `entrypoints.main` from the
 * host overlaps that HTML wait so the first paint pays less sequential download.
 */

export const CONSOLE_V3_MANIFEST_URL = '/dist/v3dist/manifest.json';
export const CONSOLE_V3_ASSET_PREFIX = '/dist/v3dist';

/**
 * Official 4.3 calls `initWujie({ isPreload: true })` on every authenticated
 * shell boot, not only list deep-links. Skip login/oauth so we do not race the
 * unauthenticated gate or waste bandwidth on the login page.
 */
export function shouldPreloadConsoleV3MainAssets(pathname: string): boolean {
  const path = String(pathname || '/').split('?')[0] || '/';
  if (path === '/login' || path.startsWith('/login/')) return false;
  if (path === '/oauth' || path.startsWith('/oauth/')) return false;
  return true;
}

export interface ConsoleV3MainEntrypoint {
  css?: string[];
  js?: string[];
}

export interface ConsoleV3Manifest {
  entrypoints?: {
    main?: ConsoleV3MainEntrypoint;
  };
}

let preloadedOnce = false;

/** Test helper: allow repeating preload in unit tests. */
export function resetConsoleV3MainAssetPreloadForTests(): void {
  preloadedOnce = false;
}

export function resolveConsoleV3AssetHref(fileName: string): string {
  const name = String(fileName || '').replace(/^\/+/, '');
  return `${CONSOLE_V3_ASSET_PREFIX}/${name}`;
}

export function ensurePreloadLink(href: string, as: 'style' | 'script'): boolean {
  if (typeof document === 'undefined' || !href) return false;
  const existing = document.head.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return false;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  document.head.appendChild(link);
  return true;
}

export function injectConsoleV3MainAssetPreloads(
  entry: ConsoleV3MainEntrypoint | undefined | null,
): { css: string[]; js: string[] } {
  const css: string[] = [];
  const js: string[] = [];
  for (const file of entry?.css || []) {
    const href = resolveConsoleV3AssetHref(file);
    if (ensurePreloadLink(href, 'style')) css.push(href);
  }
  for (const file of entry?.js || []) {
    const href = resolveConsoleV3AssetHref(file);
    if (ensurePreloadLink(href, 'script')) js.push(href);
  }
  return { css, js };
}

/**
 * Fire-and-forget: fetch the sealed v3dist manifest and preload main css/js.
 * Errors are swallowed so cold-start never depends on this helper.
 *
 * Aligns with official 4.3 shell-boot preload: warm V3 main assets while the
 * user is still on V4-native pages so the first V3 navigation feels smoother.
 */
export function preloadConsoleV3MainAssetsForRoute(
  pathname: string = typeof window === 'undefined' ? '/' : window.location.pathname,
  fetchImpl?: typeof fetch,
): void {
  if (preloadedOnce) return;
  if (!shouldPreloadConsoleV3MainAssets(pathname)) return;
  if (typeof document === 'undefined') return;
  const doFetch =
    fetchImpl ||
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);
  if (typeof doFetch !== 'function') return;
  preloadedOnce = true;

  void doFetch(CONSOLE_V3_MANIFEST_URL, { credentials: 'same-origin' })
    .then(async res => {
      if (!res.ok) return;
      const manifest = (await res.json()) as ConsoleV3Manifest;
      injectConsoleV3MainAssetPreloads(manifest?.entrypoints?.main);
    })
    .catch(() => {
      // Best-effort only.
    });
}
