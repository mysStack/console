/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';

import ConfigHistoryPage from './index';

/**
 * Entry into the modification history, rendered inside the ConfigMap / Secret page.
 *
 * The design keeps that page's own frame: its property column stays where it is and the history
 * takes over the content area beside it. So this does not open a page of its own -- it portals into
 * the embedded page's content area, the way the config reference renders into the container editor.
 *
 * Measured in the live page, inside the wujie shadow root:
 *   div.detail-page
 *     div.detail-page-sider     the property column: back link, name, action row, attributes
 *     div.detail-page-content   the content area, holding div.detail-page-nav with the ?? tab
 * The action row holds "????" and "????" as `button button-default button-size-normal`.
 */

const ENTRY_TEST_ATTR = 'config-history-entry';
const HOST_TEST_ATTR = 'config-history-host';
const CONTENT_SELECTOR = 'div.detail-page-content';

function findWujieRoot(): ShadowRoot | undefined {
  const app = document.querySelector('wujie-app');
  return (app && app.shadowRoot) || undefined;
}

/** The host element the history renders into, created once inside the content area. */
export function ensureHistoryHost(root: ShadowRoot): HTMLElement | undefined {
  const content = root.querySelector(CONTENT_SELECTOR) as HTMLElement | null;
  if (!content) {
    return undefined;
  }
  let host = content.querySelector(`[data-test="${HOST_TEST_ATTR}"]`) as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-test', HOST_TEST_ATTR);
    host.style.display = 'none';
    content.appendChild(host);
  }
  return host;
}

/**
 * Shows the host and hides the page's own content, or the reverse. Only display is touched, so
 * nothing of the embedded page is destroyed and closing restores it exactly.
 */
export function setNativeContentVisible(root: ShadowRoot, visible: boolean): void {
  const content = root.querySelector(CONTENT_SELECTOR);
  if (!content) {
    return;
  }
  Array.from(content.children).forEach(child => {
    if (child.getAttribute('data-test') === HOST_TEST_ATTR) {
      return;
    }
    (child as HTMLElement).style.display = visible ? '' : 'none';
  });
}

/** Injects the entry button once, next to the native action it belongs with. */
export function injectHistoryEntry(root: ShadowRoot, label: string, onOpen: () => void): boolean {
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
  entry.addEventListener('click', onOpen);
  anchor.parentElement.insertBefore(entry, anchor.nextSibling);
  return true;
}

/**
 * Retries while the detail page is mounted, because the embedded page appears asynchronously and
 * re-renders as the user moves inside it. Both the injection and the host are idempotent.
 */
export function useConfigHistoryEntry(
  kind: 'ConfigMap' | 'Secret',
  label: string,
): React.ReactPortal | null {
  const { cluster, namespace, name } = useParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const root = findWujieRoot();
      if (!root) {
        return;
      }
      const nextHost = ensureHistoryHost(root);
      if (nextHost) {
        setHost(previous => (previous === nextHost ? previous : nextHost));
      }
      injectHistoryEntry(root, label, () => setOpen(true));
    }, 800);
    return () => window.clearInterval(timer);
  }, [label]);

  useEffect(() => {
    const root = findWujieRoot();
    if (!root) {
      return;
    }
    setNativeContentVisible(root, !open);
    if (host) {
      host.style.display = open ? '' : 'none';
    }
  }, [open, host]);

  if (!host) {
    return null;
  }
  return createPortal(
    <ConfigHistoryPage
      kind={kind}
      cluster={cluster || ''}
      namespace={namespace || ''}
      name={name || ''}
      onBack={close}
    />,
    host,
  );
}
