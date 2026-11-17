interface EntryManifest {
  entrypoints?: { main?: { js?: string[]; css?: string[] } };
}

export function extensionV3Paths(baseUrl: string, origin: string) {
  const url = new URL(baseUrl, origin);
  const match = url.pathname.match(/^\/([a-z0-9][a-z0-9-]*)\/consolev3\/?$/);
  if (url.origin !== origin || !match || url.search || url.hash) {
    throw new Error('Invalid extension console URL');
  }
  return {
    url: url.href.replace(/\/$/, ''),
    assets: `/extensions-static/${match[1]}/dist/v3dist/`,
    webPrefix: `/${match[1]}`,
    actionEvent: `${match[1]}-console-v3-triggerAction`,
  };
}

export function buildExtensionV3Document(
  assets: string,
  manifest: EntryManifest,
  localeManifest: Record<string, string>,
  bootstrap: Record<string, any>,
): string {
  const entry = manifest.entrypoints?.main;
  if (!entry?.js?.length) throw new Error('Extension console manifest has no main entry');
  const assetUrl = (file: string) => {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(file) ||
      file.startsWith('/') ||
      file.split('/').includes('..')
    ) {
      throw new Error('Invalid extension console asset');
    }
    return assets + file;
  };
  const css = (entry.css || [])
    .map(file => `<link rel="stylesheet" href="${assetUrl(file)}">`)
    .join('');
  const js = entry.js.map(file => `<script src="${assetUrl(file)}"></script>`).join('');
  // The extension V3 entry decodes annotations on boot. Isolate and re-encode
  // annotations that the V4 host has already decoded, preserving host state.
  const ksConfig = {
    ...bootstrap.ksConfig,
    enabledExtensionModulesStatus: Object.fromEntries(
      Object.entries(bootstrap.ksConfig?.enabledExtensionModulesStatus || {}).map(
        ([name, value]) => {
          const status = value as Record<string, any>;
          return [
            name,
            {
              ...status,
              annotations:
                typeof status.annotations === 'object'
                  ? encodeURIComponent(JSON.stringify(status.annotations))
                  : status.annotations,
            },
          ];
        },
      ),
    ),
  };
  const data = JSON.stringify({ ...bootstrap, ksConfig, localeManifest }).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8">${css}<style>html,body,#root{margin:0;min-height:100%;}</style></head><body><div id="root"></div><script>window.globals=${data};</script>${js}<div class="notify-wrapper"></div></body></html>`;
}
