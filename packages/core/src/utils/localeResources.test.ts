/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocaleResources, LOCALE_FALLBACK_LANG } from './localeResources';

const FALLBACK = { fallbackLang: LOCALE_FALLBACK_LANG };

test('keeps the fallback language so i18next can resolve keys the active one lacks', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'fr',
    bundles: { fr: { HELLO: 'Bonjour' }, en: { HELLO: 'Hello', ONLY_EN: 'English only' } },
    pluginLocales: {},
  });

  assert.deepEqual(Object.keys(resources).sort(), [LOCALE_FALLBACK_LANG, 'fr']);
  assert.equal(resources.en.translation.ONLY_EN, 'English only');
});

test('the active language still wins over the fallback', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'fr',
    bundles: { fr: { HELLO: 'Bonjour' }, en: { HELLO: 'Hello' } },
    pluginLocales: {},
  });

  assert.equal(resources.fr.translation.HELLO, 'Bonjour');
});

test('merges plugin locales per language, on top of the loaded bundle', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'zh',
    bundles: { zh: { A: 'a', B: 'b' }, en: { A: 'A' } },
    pluginLocales: { zh: { B: 'plugin-b' }, en: { PLUGIN: 'plugin' } },
  });

  assert.deepEqual(resources.zh.translation, { A: 'a', B: 'plugin-b' });
  assert.deepEqual(resources.en.translation, { A: 'A', PLUGIN: 'plugin' });
});

test('does not mutate the bundles it is given', () => {
  const zh = { A: 'a' };
  const plugin = { A: 'plugin' };

  buildLocaleResources({
    ...FALLBACK,
    userLang: 'zh',
    bundles: { zh },
    pluginLocales: { zh: plugin },
  });

  assert.deepEqual(zh, { A: 'a' });
  assert.deepEqual(plugin, { A: 'plugin' });
});

test('survives bundles that failed to load', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'tc',
    bundles: { tc: undefined, en: undefined },
    pluginLocales: {},
  });

  assert.deepEqual(resources.tc.translation, {});
  assert.deepEqual(resources.en.translation, {});
});

test('registers the fallback language even when nothing was loaded for it', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'zh',
    bundles: { zh: { A: 'a' } },
    pluginLocales: {},
  });

  assert.deepEqual(Object.keys(resources).sort(), [LOCALE_FALLBACK_LANG, 'zh']);
  // resolvable but empty: a lookup falls through to the key, exactly as it did
  // before the fallback bundle was loaded at all
  assert.deepEqual(resources.en.translation, {});
});

test('an English session registers the fallback language once', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'en',
    bundles: { en: { A: 'A' } },
    pluginLocales: {},
  });

  assert.deepEqual(Object.keys(resources), [LOCALE_FALLBACK_LANG]);
  assert.deepEqual(resources.en.translation, { A: 'A' });
});

test('a plugin locale with no bundle of its own is still registered', () => {
  const resources = buildLocaleResources({
    ...FALLBACK,
    userLang: 'zh',
    bundles: { zh: { A: 'a' } },
    pluginLocales: { ko: { A: 'plugin-ko' } },
  });

  assert.deepEqual(Object.keys(resources).sort(), ['en', 'ko', 'zh']);
  assert.deepEqual(resources.ko.translation, { A: 'plugin-ko' });
});
