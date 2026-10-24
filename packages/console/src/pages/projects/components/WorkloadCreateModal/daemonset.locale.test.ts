import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

const localeRoot = path.resolve(__dirname, '../../../../../../../locales');

for (const language of ['en', 'es', 'tc', 'zh']) {
  test(`${language} DaemonSet 创建文案完整`, () => {
    const locale = require(
      path.join(localeRoot, language, 'l10n-projects-applicationWorkloads-daemonsets-list.js'),
    );
    assert.ok(locale.CREATE_DAEMONSET);
    assert.ok(locale.CREATE_DAEMONSET_FAILED);
  });
}
