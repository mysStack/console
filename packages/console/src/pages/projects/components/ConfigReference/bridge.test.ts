import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONFIG_REFERENCE_ENTRY_SELECTOR,
  CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR,
  configReferenceContainerFromHeading,
  findConfigReferenceAction,
  findConfigReferenceEnvSections,
  findConfigReferenceContainerName,
  findConfigReferenceMountParent,
  injectConfigReferenceEntry,
  shouldInjectConfigReferenceEntry,
} from './bridge';

// NOTE: the two selector assertions below only pin the constants this module
// exports. They can NOT detect the real risk — that the *prebuilt V3 artifact*
// stopped shipping `data-test="add-env-configmap"`. That can only be caught
// against a running console; see warnAnchorMissing().
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

const fakeDocument = (dialogOpen: boolean) =>
  ({
    querySelectorAll: () => [],
    querySelector: (selector: string) => (selector === '[role="dialog"]' && dialogOpen ? {} : null),
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
  }) as unknown as Document;

const captureWarnings = (run: () => void) => {
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    run();
  } finally {
    console.warn = original;
  }
  return warnings;
};

test('warns once when a dialog is open but the V3 anchor is gone', () => {
  const document = fakeDocument(true);
  const warnings = captureWarnings(() => {
    // called repeatedly on purpose: the mount hook runs on every DOM mutation
    assert.equal(
      injectConfigReferenceEntry(document, '配置引用', () => undefined),
      false,
    );
    assert.equal(
      injectConfigReferenceEntry(document, '配置引用', () => undefined),
      false,
    );
    assert.equal(
      injectConfigReferenceEntry(document, '配置引用', () => undefined),
      false,
    );
  });
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][0]), /add-env-configmap/);
});

test('stays silent while no container dialog is open', () => {
  const document = fakeDocument(false);
  const warnings = captureWarnings(() => {
    assert.equal(
      injectConfigReferenceEntry(document, '配置引用', () => undefined),
      false,
    );
  });
  assert.equal(warnings.length, 0);
});

test('injects a matching button and forwards activation to the inline editor', () => {
  const buttons: Array<{
    dataset: Record<string, string>;
    textContent: string;
    before: unknown;
    click: (event?: { preventDefault: () => void; stopPropagation: () => void }) => void;
  }> = [];
  let activated = 0;
  // Declared with the event signature so `typeof injectedClick` still matches the
  // listener the bridge registers; the implementation takes no argument.
  let injectedClick: (event?: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => void = () => undefined;
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
  const documentWithAction = {
    querySelector: (selector: string) =>
      selector === CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR ? action : null,
    querySelectorAll: (selector: string) =>
      selector === CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR ? [action] : [],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    createElement: () => createdContent,
  } as unknown as Document;

  assert.equal(
    injectConfigReferenceEntry(documentWithAction, '配置引用', () => {
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

test('reads the visible V3 container editor as the configuration target', () => {
  const visibleInput = {
    value: 'wes-v2-server',
    getAttribute: () => null,
    parentElement: null,
  } as unknown as HTMLInputElement;
  const document = {
    querySelectorAll: (selector: string) =>
      selector === 'input[placeholder="Container Name*"]' ? [visibleInput] : [],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
  } as unknown as Document;

  assert.equal(findConfigReferenceContainerName(document), 'wes-v2-server');
});

interface FakeCard {
  name: string;
  href?: string;
}

/**
 * Stand-in for the read-only environment tab: `div.detail-page-content` holding a
 * tab bar and a pane, the pane holding one card per container, each card holding a
 * heading whose first child is the container glyph.
 */
const fakeEnvTabDocument = (cards: FakeCard[], activeHref = '/env') => {
  const pane: any = {
    children: [],
    querySelectorAll: (selector: string) =>
      selector === 'use' ? pane.children.map((card: any) => card.children[0].children[0]) : [],
  };

  pane.children = cards.map(card => {
    const marker: any = {
      parentElement: undefined,
      getAttribute: (attribute: string) =>
        attribute === 'href' ? card.href || '#icon-docker' : null,
    };
    const heading: any = {
      textContent: `容器：${card.name}`,
      children: [marker],
      parentElement: undefined,
    };
    const wrapper: any = { children: [heading], parentElement: pane };
    marker.parentElement = heading;
    heading.parentElement = wrapper;
    return wrapper;
  });

  const content: any = {
    children: [{}, pane],
    lastElementChild: pane,
    querySelector: (selector: string) =>
      selector === 'a[aria-current="page"]' ? { getAttribute: () => activeHref } : null,
  };

  return {
    querySelector: (selector: string) => (selector === 'div.detail-page-content' ? content : null),
    defaultView: { location: { pathname: activeHref } },
  } as unknown as Document;
};

test('reads the container name out of a card heading, in either script', () => {
  assert.equal(configReferenceContainerFromHeading('容器：ams-server'), 'ams-server');
  assert.equal(configReferenceContainerFromHeading('Container: log-sidecar'), 'log-sidecar');
  assert.equal(configReferenceContainerFromHeading('容器：  spaced  '), 'spaced');
  // a container name can never contain a colon, so the last separator wins
  assert.equal(configReferenceContainerFromHeading('a: b: main'), 'main');
  assert.equal(configReferenceContainerFromHeading('no-separator'), 'no-separator');
  assert.equal(configReferenceContainerFromHeading(''), '');
});

test('finds one section per container card, in page order', () => {
  const sections = findConfigReferenceEnvSections(
    fakeEnvTabDocument([{ name: 'main' }, { name: 'sidecar' }]),
  );
  assert.deepEqual(
    sections.map(section => [section.containerName, section.index]),
    [
      ['main', 0],
      ['sidecar', 1],
    ],
  );
});

test('ignores headings that are not container cards', () => {
  const sections = findConfigReferenceEnvSections(
    fakeEnvTabDocument([{ name: 'main' }, { name: 'other', href: '#icon-something-else' }]),
  );
  assert.deepEqual(
    sections.map(section => section.containerName),
    ['main'],
  );
});

test('finds no section while another tab is active', () => {
  assert.deepEqual(
    findConfigReferenceEnvSections(fakeEnvTabDocument([{ name: 'main' }], '/resource-status')),
    [],
  );
});
