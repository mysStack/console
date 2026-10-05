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

function isVisibleAction(document: Document, action: HTMLButtonElement): boolean {
  let current: HTMLElement | null = action;
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

export function injectConfigReferenceEntry(
  document: Document,
  label: string,
  onActivate: () => void,
): boolean {
  const action = findConfigReferenceAction(document);
  const parent = action?.parentElement;
  const entryExists = Boolean(parent?.querySelector(CONFIG_REFERENCE_ENTRY_SELECTOR));

  if (
    !action ||
    !parent ||
    !shouldInjectConfigReferenceEntry({ actionExists: true, entryExists })
  ) {
    return false;
  }

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
