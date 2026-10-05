import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONFIG_REFERENCE_ENTRY_SELECTOR,
  CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR,
  findConfigReferenceAction,
  findConfigReferenceMountParent,
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

test('injects a matching button and forwards activation to the inline editor', () => {
  const buttons: Array<{
    dataset: Record<string, string>;
    textContent: string;
    before: unknown;
    click: (event?: { preventDefault: () => void; stopPropagation: () => void }) => void;
  }> = [];
  let activated = 0;
  let injectedClick = (_event?: { preventDefault: () => void; stopPropagation: () => void }) =>
    undefined;
  const content = { className: 'button-content' } as HTMLElement;
  const createdContent = { className: '', textContent: '' };
  const action = {
    nextSibling: null,
    getAttribute: () => null,
    parentElement: {
      querySelector: (selector: string) =>
        selector === CONFIG_REFERENCE_ENTRY_SELECTOR ? null : undefined,
      insertBefore: (
        entry: {
          dataset: Record<string, string>;
          textContent: string;
          click: (event?: { preventDefault: () => void; stopPropagation: () => void }) => void;
        },
        before: unknown,
      ) =>
        buttons.push({
          dataset: entry.dataset,
          textContent: entry.textContent,
          before,
          click: injectedClick,
        }),
    },
    querySelector: () => content,
    closest: () => null,
    cloneNode: () => ({
      dataset: {} as Record<string, string>,
      textContent: '',
      type: '',
      querySelector: () => null,
      addEventListener: (_event: string, listener: typeof injectedClick) => {
        injectedClick = listener;
      },
      appendChild: function (child: { textContent: string }) {
        this.textContent = child.textContent;
      },
    }),
    addEventListener: () => undefined,
  } as unknown as HTMLButtonElement;
  const fakeDocument = {
    querySelector: (selector: string) =>
      selector === CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR ? action : null,
    querySelectorAll: (selector: string) =>
      selector === CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR ? [action] : [],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    createElement: () => createdContent,
  } as unknown as Document;

  assert.equal(
    injectConfigReferenceEntry(fakeDocument, '配置引用', () => {
      activated += 1;
    }),
    true,
  );
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.test, 'config-reference-entry');
  assert.equal(buttons[0].textContent, '配置引用');
  assert.equal(buttons[0].before, action.nextSibling);
  buttons[0].click({ preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(activated, 1);
});

test('prefers the visible action in the active dialog', () => {
  const hidden = {
    closest: () => null,
    getAttribute: () => null,
    parentElement: null,
  } as unknown as HTMLButtonElement;
  const visible = {
    closest: (selector: string) => (selector === '[role="dialog"]' ? {} : null),
    getAttribute: () => null,
    parentElement: null,
  } as unknown as HTMLButtonElement;
  const document = {
    querySelectorAll: () => [hidden, visible],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
  } as unknown as Document;

  assert.equal(findConfigReferenceAction(document), visible);
});

test('mounts the inline editor beside the V3 action row', () => {
  const rowParent = { className: 'text-right' } as HTMLElement;
  const row = { parentElement: rowParent } as HTMLElement;
  const action = { parentElement: row } as HTMLButtonElement;

  assert.equal(findConfigReferenceMountParent(action), rowParent);
});
