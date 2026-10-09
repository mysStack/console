/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Entry into the modification history from the ConfigMap / Secret detail page.
 *
 * That detail page is the V3 console embedded through wujie, so the button cannot be added to its
 * source. Instead a matching button is injected into its shadow root, the way the config reference
 * entry already does it for workloads: same classes as the native button beside it, so it looks
 * like part of the page rather than like something bolted on.
 *
 * The anchor was measured in the live page: the action row holds "????" and "????" as
 * `button button-default button-size-normal` inside the wujie shadow root, one level down.
 */

const ENTRY_TEST_ATTR = 'config-history-entry';

/** The wujie host element whose shadow root carries the embedded V3 page. */
function findWujieRoot(): ShadowRoot | undefined {
  const app = document.querySelector('wujie-app');
  return (app && app.shadowRoot) || undefined;
}

/** Injects the entry button once, next to the native action it belongs with. */
export function injectHistoryEntry(root: ShadowRoot, label: string, onClick: () => void): boolean {
  if (root.querySelector(`[data-test="${ENTRY_TEST_ATTR}"]`)) {
    return false;
  }
  const buttons = Array.from(root.querySelectorAll('button'));
  const anchor = buttons.find(button => (button.textContent || '').trim() === '????') || buttons[0];
  if (!anchor || !anchor.parentElement) {
    return false;
  }
  const entry = document.createElement('button');
  entry.setAttribute('data-test', ENTRY_TEST_ATTR);
  entry.className = anchor.className;
  entry.type = 'button';
  entry.textContent = label;
  entry.addEventListener('click', onClick);
  anchor.parentElement.insertBefore(entry, anchor.nextSibling);
  return true;
}

/**
 * Runs for as long as the detail page is mounted: the embedded page appears asynchronously and
 * re-renders as the user navigates inside it, so the injection is retried and is idempotent.
 */
export function useConfigHistoryEntry(kind: 'ConfigMap' | 'Secret', label: string): void {
  const { workspace, cluster, namespace, name } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const path = `/${workspace}/clusters/${cluster}/projects/${namespace}/${
      kind === 'ConfigMap' ? 'configmaps' : 'secrets'
    }/${name}/history`;
    const timer = window.setInterval(() => {
      const root = findWujieRoot();
      if (root) {
        injectHistoryEntry(root, label, () => navigate(path));
      }
    }, 800);
    return () => window.clearInterval(timer);
  }, [kind, label, name, navigate, namespace, cluster, workspace]);
}
