/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import get from 'lodash/get';
import i18next from 'i18next';
import { ENV, cookie, getBrowserLang, request } from '@ks-console/shared';
import { buildLocaleResources, LOCALE_FALLBACK_LANG } from './localeResources';
import type { LocaleBundle } from './localeResources';

const localeRequests = new Map<string, Promise<LocaleBundle | undefined>>();
let initialization: Promise<unknown> | undefined;

const resolveLocalePath = (lang?: string) => {
  if (!lang) {
    return '';
  }
  if (ENV.isProduction) {
    const file = globals.manifest?.[`locales-${lang}`];
    return file ? `dist/${file}` : '';
  }
  return `locales/${lang}.json`;
};

/**
 * A locale bundle is nice-to-have: an unreachable or unlisted one must not stop the
 * console from booting, so a failure degrades to an untranslated bundle.
 */
const loadLocale = async (lang?: string): Promise<LocaleBundle | undefined> => {
  const path = resolveLocalePath(lang);
  if (!path) {
    return undefined;
  }
  const cached = ENV.isProduction && localeRequests.get(path);
  if (cached) return cached;

  const pending = (async () => {
    try {
      // The shared axios instance unwraps `response.data` in a response interceptor
      // (packages/shared/src/utils/request.ts), so the second generic states what
      // actually resolves. Same idiom as request.get<never, OriginalPodList>; the
      // callable form declares no generics, hence `.get` rather than `request(path)`.
      return await request.get<never, LocaleBundle>(path);
    } catch (error) {
      // A temporary failure must not poison the cache for later extensions.
      localeRequests.delete(path);
      console.warn(`[i18n] could not load the ${lang} locale bundle from ${path}`, error);
      return undefined;
    }
  })();
  // Development locale URLs have no content hash and must remain reloadable.
  if (ENV.isProduction) localeRequests.set(path, pending);
  return pending;
};

const init = async () => {
  const userLang = get(globals.user, 'lang') || getBrowserLang();
  if (userLang && cookie('lang') !== userLang) {
    cookie('lang', userLang);
  }

  // i18next's `fallbackLng` can only resolve a key that is present in `resources`,
  // and no backend is configured to fetch whatever is missing, so the fallback
  // bundle has to be loaded here too. Without it, every key absent from the active
  // bundle — a language that is only partly translated, a plugin that ships English
  // only, a language whose bundle is empty — renders as the raw key name
  // (`FEEDBACK` instead of a label).
  const [activeBundle, fallbackBundle] = await Promise.all([
    loadLocale(userLang),
    userLang === LOCALE_FALLBACK_LANG ? undefined : loadLocale(LOCALE_FALLBACK_LANG),
  ]);

  const bundles: Record<string, LocaleBundle | undefined> = {
    [LOCALE_FALLBACK_LANG]: fallbackBundle,
  };
  if (userLang) {
    bundles[userLang] = activeBundle;
  }

  const { locales: pluginLocales } = globals.context;
  const totalLocales = buildLocaleResources({
    userLang,
    fallbackLang: LOCALE_FALLBACK_LANG,
    bundles,
    pluginLocales,
  });

  if (initialization) {
    await initialization;
    for (const [lang, { translation }] of Object.entries(totalLocales)) {
      // Replace the complete namespace so a changed manifest can remove old keys.
      i18next.removeResourceBundle(lang, 'translation');
      i18next.addResourceBundle(lang, 'translation', translation);
    }
    if (userLang && i18next.language !== userLang) {
      await i18next.changeLanguage(userLang);
    }
    return;
  }

  initialization = i18next.init(
    {
      lng: userLang,
      fallbackLng: LOCALE_FALLBACK_LANG,
      debug: false,
      resources: totalLocales,
      // defaultNS: ['common'],
      interpolation: {
        prefix: '{',
        suffix: '}',
      },
    },
    (err, t) => {
      // @ts-ignore
      window.t = t;
    },
  );
  try {
    await initialization;
  } catch (error) {
    initialization = undefined;
    throw error;
  }
};

export default { init };
