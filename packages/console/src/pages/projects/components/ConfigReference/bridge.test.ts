import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONFIG_REFERENCE_ENTRY_SELECTOR,
  CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR,
  injectConfigReferenceEntry,
  shouldInjectConfigReferenceEntry,
} from './bridge';

test('targets the environment variable actions instead of the workload detail tabs', () => {
  assert.equal(CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR, '[data-test="add-env-configmap"]');
  assert.equal(CONFIG_REFERENCE_ENTRY_SELECTOR, '[data-test="config-reference-entry"]');
  assert.equal(shouldInjectConfigReferenceEntry({ actionExists: true, entryExists: false }), true);
  assert.equal(shouldInjectConfigReferenceEntry({ actionExists: true, entryExists: true }), false);
  assert.equal(
    shouldInjectConfigReferenceEntry({ actionExists: false, entryExists: false }),
    false,
  );
});

test('injects a matching button before the existing batch-reference action', () => {
  const buttons: Array<{ dataset: Record<string, string>; textContent: string; before: unknown }> =
    [];
  const content = { className: 'button-content' } as HTMLElement;
  const createdContent = { className: '', textContent: '' };
  const action = {
    nextSibling: null,
    parentElement: {
      querySelector: (selector: string) =>
        selector === CONFIG_REFERENCE_ENTRY_SELECTOR ? null : undefined,
      insertBefore: (
        entry: { dataset: Record<string, string>; textContent: string },
        before: unknown,
      ) => buttons.push({ dataset: entry.dataset, textContent: entry.textContent, before }),
    },
    querySelector: () => content,
    cloneNode: () => ({
      dataset: {} as Record<string, string>,
      textContent: '',
      type: '',
      addEventListener: () => undefined,
      appendChild: function (child: { textContent: string }) {
        this.textContent = child.textContent;
      },
    }),
    addEventListener: () => undefined,
  } as unknown as HTMLButtonElement;
  const fakeDocument = {
    querySelector: (selector: string) =>
      selector === CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR ? action : null,
    createElement: () => createdContent,
  } as unknown as Document;

  assert.equal(
    injectConfigReferenceEntry(fakeDocument, '配置引用', () => undefined),
    true,
  );
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.test, 'config-reference-entry');
  assert.equal(buttons[0].textContent, '配置引用');
  assert.equal(buttons[0].before, action.nextSibling);
});
