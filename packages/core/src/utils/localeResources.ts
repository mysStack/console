/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { merge } from 'lodash';

/** The language every locale falls back to. Must match i18n.ts's `fallbackLng`. */
export const LOCALE_FALLBACK_LANG = 'en';

export type LocaleBundle = Record<string, unknown>;

export interface BuildLocaleResourcesInput {
  userLang?: string;
  /**
   * Language every lookup falls back to. Registered even when its bundle failed to
   * load, so that `fallbackLng` always has an entry to look in.
   */
  fallbackLang?: string;
  /** Loaded bundles keyed by language: the active one and the fallback one. */
  bundles: Record<string, LocaleBundle | undefined>;
  pluginLocales?: Record<string, LocaleBundle | undefined>;
}

/**
 * Assemble the `resources` object handed to i18next.
 *
 * `fallbackLng` can only resolve a key that is present in `resources`, and no
 * backend is configured to fetch what is missing, so the fallback language's bundle
 * has to be in here as well. Otherwise every key absent from the active bundle — a
 * language that is only partly translated, a plugin that ships English only, a
 * language whose bundle is empty — renders as the raw key name.
 *
 * Plugin locales are merged per language on top of whatever that language already
 * has, and neither input object is mutated.
 */
export function buildLocaleResources({
  userLang,
  fallbackLang,
  bundles,
  pluginLocales,
}: BuildLocaleResourcesInput): Record<string, { translation: LocaleBundle }> {
  const languages = new Set<string>();
  const addLanguage = (lang?: string) => {
    if (lang) {
      languages.add(lang);
    }
  };

  addLanguage(userLang);
  addLanguage(fallbackLang);
  Object.keys(bundles).forEach(addLanguage);
  Object.keys(pluginLocales || {}).forEach(addLanguage);

  const resources: Record<string, { translation: LocaleBundle }> = {};
  languages.forEach(lang => {
    resources[lang] = {
      translation: merge({}, bundles[lang], pluginLocales?.[lang]) as LocaleBundle,
    };
  });

  return resources;
}
