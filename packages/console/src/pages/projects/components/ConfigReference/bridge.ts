export const CONFIG_REFERENCE_ENTRY_SELECTOR = '[data-test="config-reference-entry"]';
export const CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR = '[data-test="add-env-configmap"]';

export interface ConfigReferenceInjectionState {
  actionExists: boolean;
  entryExists: boolean;
}

export function shouldInjectConfigReferenceEntry({
  actionExists,
  entryExists,
}: ConfigReferenceInjectionState): boolean {
  return actionExists && !entryExists;
}

function isVisibleAction(document: Document, element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.getAttribute?.('aria-hidden') === 'true') {
      return false;
    }
    const style = document.defaultView?.getComputedStyle(current);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return false;
    }
    current = current.parentElement as HTMLElement | null;
  }
  return true;
}

/** Reads the container currently being edited by the embedded V3 form. */
export function findConfigReferenceContainerName(document: Document): string | undefined {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[placeholder="Container Name*"]'),
  ).filter(input => isVisibleAction(document, input));
  const value = inputs[inputs.length - 1]?.value?.trim();
  return value || undefined;
}

export function findConfigReferenceAction(document: Document): HTMLButtonElement | undefined {
  const actions = Array.from(
    document.querySelectorAll<HTMLButtonElement>(CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR),
  ).filter(action => isVisibleAction(document, action));

  const dialogActions = actions.filter(action => action.closest('[role="dialog"]'));
  return dialogActions[dialogActions.length - 1] || actions[actions.length - 1];
}

/**
 * Returns the V3 action-row container where the injected entry should mount its
 * inline editor. Keeping this beside the native V3 action row is important:
 * the editor is part of the existing container dialog, not a second route or
 * drawer owned by the host console.
 */
export function findConfigReferenceMountParent(
  action: HTMLButtonElement | undefined,
): HTMLElement | undefined {
  const actionRow = action?.parentElement;
  return actionRow?.parentElement || actionRow || undefined;
}

/**
 * Documents we have already warned about. The mount hook runs on every DOM
 * mutation, so an un-guarded warning would flood the console while no container
 * dialog is open.
 */
const anchorWarnedDocuments = new WeakSet<Document>();

/**
 * Surfaces the silent-failure mode of this bridge: the embedded V3 console is a
 * prebuilt artifact, so if it ever renames its `data-test` attributes the
 * injection anchor stops matching and the entry simply never appears.
 *
 * We only warn while a container dialog is actually open, and only once per
 * document until the anchor is found again.
 */
function warnAnchorMissing(document: Document): void {
  if (anchorWarnedDocuments.has(document)) {
    return;
  }
  if (!document.querySelector('[role="dialog"]')) {
    return;
  }
  anchorWarnedDocuments.add(document);
  // eslint-disable-next-line no-console
  console.warn(
    `[config-reference] no element matched ${CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR} ` +
      'inside an open dialog, so the Configuration Reference entry was not injected. ' +
      'The embedded V3 console has probably changed its data-test attributes.',
  );
}

export const CONFIG_REFERENCE_ENV_NAME_SELECTOR = 'input[name="name"]';

/** How far to walk up from the V3 action row looking for the environment list. */
const ENV_LIST_MAX_HOPS = 4;

/**
 * Locates the embedded V3 environment-variable list.
 *
 * Verified against the live console (KubeSphere 4.1.1). The injected entry lives
 * inside the V3 action row, and the list of rows is an ANCESTOR of that row —
 * measured chain from the action button:
 *
 *   0 button | 1 action wrapper | 2 div.text-right  (0 name inputs)
 *   3 wrapper (0) | 4 the list root (33 name inputs, one per environment row)
 *
 * `input[name="name"]` is NOT unique in the container form — the container-name
 * and port-name inputs share it — so the scope has to be the list root and never
 * a broader ancestor. Walking up and taking the nearest match keeps that safe
 * even if V3 adds or removes wrapper elements.
 */
export function findManualEnvScope(action: HTMLButtonElement | undefined): HTMLElement | undefined {
  let node = findConfigReferenceMountParent(action);
  for (let hop = 0; node && hop < ENV_LIST_MAX_HOPS; hop += 1) {
    if (node.querySelector(CONFIG_REFERENCE_ENV_NAME_SELECTOR)) {
      return node;
    }
    node = node.parentElement as HTMLElement | undefined;
  }
  return undefined;
}

/**
 * Reads the environment-variable names currently present in the list, INCLUDING
 * unsaved edits — migrating from key-by-key references to a whole-file reference
 * is exactly when these start colliding with envFrom.
 *
 * Returns undefined when the list could not be located, so callers can tell
 * "no conflicts" apart from "could not read" and stay silent instead of warning
 * about something they never actually saw.
 */
export function readManualEnvNames(scope: HTMLElement | undefined): string[] | undefined {
  if (!scope) {
    return undefined;
  }

  return Array.from(scope.querySelectorAll<HTMLInputElement>(CONFIG_REFERENCE_ENV_NAME_SELECTOR))
    .map(input => (typeof input.value === 'string' ? input.value.trim() : ''))
    .filter(Boolean);
}

export function injectConfigReferenceEntry(
  document: Document,
  label: string,
  onActivate: () => void,
): boolean {
  const action = findConfigReferenceAction(document);
  const parent = action?.parentElement;
  const entryExists = Boolean(parent?.querySelector(CONFIG_REFERENCE_ENTRY_SELECTOR));

  if (!action || !parent) {
    warnAnchorMissing(document);
    return false;
  }

  if (!shouldInjectConfigReferenceEntry({ actionExists: true, entryExists })) {
    return false;
  }

  // The anchor is back; allow a future regression to warn again.
  anchorWarnedDocuments.delete(document);

  const entry = action.cloneNode(true) as HTMLButtonElement;
  entry.type = 'button';
  entry.dataset.test = 'config-reference-entry';
  const actionContent = action.querySelector<HTMLElement>('.button-content');
  if (actionContent) {
    const content = entry.querySelector<HTMLElement>('.button-content');
    if (content) {
      content.textContent = label;
    } else {
      const fallback = document.createElement('div');
      fallback.className = actionContent.className;
      fallback.textContent = label;
      entry.appendChild(fallback);
    }
  } else {
    entry.textContent = label;
  }
  entry.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  });

  parent.insertBefore(entry, action.nextSibling);
  return true;
}
