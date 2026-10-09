/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';

import ConfigHistoryPage from './index';

/**
 * Modification history, rendered inside the ConfigMap / Secret page.
 *
 * The design keeps that page's own frame and puts the history where the page's own content goes, so
 * this portals into the content area rather than opening a page of its own. The entry is a second
 * item in the page's real tab strip, following the design, and the object's own attributes gain the
 * two rows the design shows.
 *
 * Measured in the live page, inside the wujie shadow root:
 *   div.detail-page
 *     div.detail-page-sider          property column; holds [data-test="detail-attrs"]
 *     div.detail-page-content        content area; holds div.detail-page-nav (the ?? tab)
 * The tab item is an <a> styled 4px radius, padding 0 14px, background #55bc8a, 12px white.
 * Attribute rows are <li><div><span>??: </span></div><div><span>host</span></div></li>.
 */

const NAV_ITEM_ATTR = 'config-history-nav';
const HOST_TEST_ATTR = 'config-history-host';
const MANAGED_BY_ATTR = 'config-history-managed-by';
const UPDATED_AT_ATTR = 'config-history-updated-at';
const CONTENT_SELECTOR = 'div.detail-page-content';
const NAV_SELECTOR = 'div.detail-page-nav';
const ATTRS_SELECTOR = '[data-test="detail-attrs"]';
const ACTIVE_TAB_CLASS_FRAGMENT = '_2wmp-lQI4i6jOfSemwExp2';

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
    // The page's own tab strip stays: it carries the entry, and the design shows both tabs with
    // ???? current while the history is open. Only what sits beside it is swapped out.
    const isNav = child.matches?.(NAV_SELECTOR) || !!child.querySelector?.(NAV_SELECTOR);
    if (isNav) {
      Array.from((child as HTMLElement).children).forEach(grandChild => {
        if (!grandChild.matches?.(NAV_SELECTOR)) {
          (grandChild as HTMLElement).style.display = visible ? '' : 'none';
        }
      });
      return;
    }
    (child as HTMLElement).style.display = visible ? '' : 'none';
  });
}

/**
 * The entry, as a second item in the page's real tab strip. It copies the native item's classes so
 * the strip keeps its own look, and the native item is only marked inactive rather than rebuilt.
 */
export function injectHistoryNavItem(root: ShadowRoot, label: string, onOpen: () => void): boolean {
  if (root.querySelector(`[data-test="${NAV_ITEM_ATTR}"]`)) {
    return false;
  }
  const nav = root.querySelector(NAV_SELECTOR);
  const nativeItem = nav && (nav.querySelector('a') as HTMLAnchorElement | null);
  if (!nav || !nativeItem) {
    return false;
  }
  const item = nativeItem.cloneNode(false) as HTMLAnchorElement;
  item.setAttribute('data-test', NAV_ITEM_ATTR);
  item.removeAttribute('aria-current');
  item.removeAttribute('href');
  item.textContent = label;
  item.style.cursor = 'pointer';
  item.addEventListener('click', onOpen);
  nav.appendChild(item);
  return true;
}

/** Reflects which of the two tab items is the current one, without touching any other styling. */
export function setActiveTab(root: ShadowRoot, historyActive: boolean): void {
  const nav = root.querySelector(NAV_SELECTOR);
  if (!nav) {
    return;
  }
  Array.from(nav.querySelectorAll('a')).forEach(item => {
    const isHistory = item.getAttribute('data-test') === NAV_ITEM_ATTR;
    const active = isHistory === historyActive;
    const classes = (item.className || '').split(/\s+/).filter(Boolean);
    const withoutActive = classes.filter(name => name !== ACTIVE_TAB_CLASS_FRAGMENT);
    item.className = (active ? [...withoutActive, ACTIVE_TAB_CLASS_FRAGMENT] : withoutActive).join(
      ' ',
    );
    if (active) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

/** The two rows the design adds to the object's own attributes. */
export function setAttributeRows(
  root: ShadowRoot,
  rows: Array<{ attr: string; label: string; value: string }>,
): void {
  const attrs = root.querySelector(ATTRS_SELECTOR);
  const list = attrs && attrs.querySelector('ul');
  const template = list && (list.querySelector('li') as HTMLLIElement | null);
  if (!list || !template) {
    return;
  }
  rows.forEach(row => {
    let item = list.querySelector(`li[data-test="${row.attr}"]`) as HTMLLIElement | null;
    if (!item) {
      item = template.cloneNode(true) as HTMLLIElement;
      item.setAttribute('data-test', row.attr);
      list.appendChild(item);
    }
    const cells = item.querySelectorAll('div');
    if (cells.length >= 2) {
      const label = cells[0].querySelector('span');
      const value = cells[1].querySelector('span');
      if (label) {
        label.textContent = `${row.label}: `;
      }
      if (value) {
        value.textContent = row.value;
        value.setAttribute('title', row.value);
      }
    }
  });
}

/**
 * Retries while the detail page is mounted, because the embedded page appears asynchronously and
 * re-renders as the user moves inside it. Every step is idempotent.
 */
export function useConfigHistoryEntry(
  kind: 'ConfigMap' | 'Secret',
  label: string,
  managedByLabel: (record: { managedBy: string; managedByRef?: string }) => string,
  formatTime: (value: string) => string,
): {
  portal: React.ReactPortal | null;
  setSummary: (
    summary: { managedBy: string; managedByRef?: string; createdAt: string } | undefined,
  ) => void;
} {
  const { cluster, namespace, name } = useParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<
    { managedBy: string; managedByRef?: string; createdAt: string } | undefined
  >();
  const close = useCallback(() => setOpen(false), []);
  const summaryRef = React.useRef(summary);
  summaryRef.current = summary;

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
      injectHistoryNavItem(root, label, () => setOpen(true));
    }, 800);
    return () => window.clearInterval(timer);
  }, [label]);

  useEffect(() => {
    const root = findWujieRoot();
    if (!root) {
      return;
    }
    setNativeContentVisible(root, !open);
    setActiveTab(root, open);
    if (host) {
      host.style.display = open ? '' : 'none';
    }
  }, [open, host]);

  // Applied from the same retry loop as the tab: the embedded page re-renders as the user moves
  // inside it, so one shot is not enough. Every call is idempotent.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const root = findWujieRoot();
      if (!root || !summaryRef.current) {
        return;
      }
      const current = summaryRef.current;
      setAttributeRows(root, [
        {
          attr: MANAGED_BY_ATTR,
          label: t('CONFIG_HISTORY_MANAGED_BY'),
          value: managedByLabel(current),
        },
        {
          attr: UPDATED_AT_ATTR,
          label: t('CONFIG_HISTORY_CHANGED_AT'),
          value: current.createdAt ? formatTime(current.createdAt) : '-',
        },
      ]);
    }, 800);
    return () => window.clearInterval(timer);
  }, [managedByLabel, formatTime]);

  if (!host) {
    return { portal: null, setSummary };
  }
  return {
    portal: createPortal(
      <ConfigHistoryPage
        kind={kind}
        cluster={cluster || ''}
        namespace={namespace || ''}
        name={name || ''}
        onBack={close}
        onLoaded={setSummary}
      />,
      host,
    ),
    setSummary,
  };
}
