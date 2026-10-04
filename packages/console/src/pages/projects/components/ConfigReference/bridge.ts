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

export function injectConfigReferenceEntry(
  document: Document,
  label: string,
  onActivate: () => void,
): boolean {
  const action = document.querySelector<HTMLButtonElement>(
    CONFIG_REFERENCE_ENVIRONMENT_ACTION_SELECTOR,
  );
  const parent = action?.parentElement;
  const entryExists = Boolean(parent?.querySelector(CONFIG_REFERENCE_ENTRY_SELECTOR));

  if (
    !action ||
    !parent ||
    !shouldInjectConfigReferenceEntry({ actionExists: true, entryExists })
  ) {
    return false;
  }

  const entry = action.cloneNode(false) as HTMLButtonElement;
  entry.type = 'button';
  entry.dataset.test = 'config-reference-entry';
  const actionContent = action.querySelector<HTMLElement>('.button-content');
  if (actionContent) {
    const content = document.createElement('div');
    content.className = actionContent.className;
    content.textContent = label;
    entry.appendChild(content);
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
