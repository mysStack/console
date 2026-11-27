/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { isEmpty } from 'lodash';

import { ENV } from '@ks-console/shared';
import type { ExtensionConfig } from '../types/extension-config';
import { resolveExtensionConfig } from './extensions.config';
import i18n from './i18n';

interface Extension {
  name: string;
  extensionName: string;
  link: string;
  resourceVersion: string;
  entries?: ExtensionConfig['menus'];
}

interface ExtensionConfigWithName extends ExtensionConfig {
  extensionName: string;
}

function importRemoteExtensions(extensions: Extension[]) {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    return Promise.resolve([]);
  }

  // Fetch and resolve all extension configs concurrently. The host routes already
  // wait for this batch, so rebuilding the complete locale resources once for each
  // module wastes main-thread work without making a page available earlier.
  const pending = extensions.map(async extension => {
    const { extensionName, link, resourceVersion, entries } = extension;
    const moduleId = `/pstatic${link}?resourceVersion=${resourceVersion}`;
    const { default: input } = await System.import(moduleId);
    const extensionConfig = input ? await resolveExtensionConfig(input) : null;
    globals.context.registerLocales(extensionConfig?.locales);
    return { extensionName, entries, extensionConfig };
  });

  const refreshLocales = Promise.allSettled(pending).then(async results => {
    if (results.some(result => result.status === 'fulfilled')) {
      try {
        await i18n.init();
      } catch {
        // Retain a retry opportunity if refreshing the shared locales fails.
        await i18n.init();
      }
    }
  });

  const promises = pending.map((config, index) =>
    config
      .then(async ({ extensionName, entries, extensionConfig }) => {
        // Register routes/menus only once their translations are available.
        await refreshLocales;
        const newExtensionConfig = { ...extensionConfig };
        if (Array.isArray(entries) && entries.length > 0) {
          newExtensionConfig.menus = entries;
        }
        if (!isEmpty(newExtensionConfig)) {
          globals.context.registerExtension(newExtensionConfig, { extensionName });
        }
        return { ...extensionConfig, extensionName } as ExtensionConfigWithName;
      })
      .catch(reason => {
        console.error(`[${extensions[index].extensionName}]`, reason);
        throw reason;
      }),
  );

  return Promise.allSettled(promises);
}

export function registerRemoteExtensions() {
  const remoteExtensions = globals?.installedExtensions ?? [];

  if (ENV.isProduction) {
    return importRemoteExtensions(remoteExtensions);
  } else if (ENV.isDevelopment) {
    const installedExtensionNames = remoteExtensions.map(({ extensionName }) => extensionName);

    let includes = globals.config.importRemoteExtensions?.includes ?? [];
    let excludes = globals.config.importRemoteExtensions?.excludes ?? [];

    if (!Array.isArray(includes)) {
      includes = [];
    }
    if (!Array.isArray(excludes)) {
      excludes = [];
    }

    if (includes.includes('*')) {
      includes = [...installedExtensionNames];
    }
    if (excludes.includes('*')) {
      excludes = [...installedExtensionNames];
    }

    const extensions = remoteExtensions.filter(({ extensionName }) => {
      return includes.includes(extensionName) && !excludes.includes(extensionName);
    });
    return importRemoteExtensions(extensions);
  }
}
