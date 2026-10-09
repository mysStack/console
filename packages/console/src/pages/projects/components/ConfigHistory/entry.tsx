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
 * Two peer views, switched by the page's own tab strip:
 *   数据      shows the page's own data
 *   修改记录  shows the modification history
 * Whichever was clicked last is shown and marked current. This is not "open a panel, then find your
 * way back": the page's own tab is read as one half of a switch, which is what it looks like.
 *
 * Measured on the live page, and the measurement is the only reason the tab strip is handled the way
 * it is: the ConfigMap and Secret detail pages have exactly ONE native tab (数据). The
 * 资源状态 / 元数据 / 事件 tabs belong to the workload pages, and an early mockup borrowed them by
 * mistake. Searching the wujie shadow root and both iframes for 元数据 and 事件 finds nothing.
 *
 *   div.detail-page
 *     div.detail-page-sider   property column, holds [data-test="detail-attrs"]
 *     div.detail-page-content content area, holds div.detail-page-nav with its single tab
 * The tab is an <a> pointing at the page it is already on, so its click must be taken over with
 * preventDefault -- otherwise it would reload the embedded page instead of switching the view.
 */

const NAV_ITEM_ATTR = 'config-history-nav';
const HOST_TEST_ATTR = 'config-history-host';
const MANAGED_BY_ATTR = 'config-history-managed-by';
const UPDATED_AT_ATTR = 'config-history-updated-at';
const CONTENT_SELECTOR = 'div.detail-page-content';
const NAV_SELECTOR = 'div.detail-page-nav';
const ATTRS_SELECTOR = '[data-test="detail-attrs"]';
const ACTIVE_TAB_CLASS_FRAGMENT = '_2wmp-lQI4i6jOfSemwExp2';

type View = 'data' | 'history';

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
 * Hides what sits beside the history host while the history is shown, and restores it for the data
 * view. The tab strip is skipped entirely -- not its children, the strip itself -- because an earlier
 * version treated the strip as a wrapper and hid the tabs, leaving an empty bar.
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
    if (child.matches?.(NAV_SELECTOR)) {
      return;
    }
    if (child.querySelector?.(NAV_SELECTOR)) {
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
 * The entry, as a second item in the page's own tab strip, placed directly after the native tab so
 * the strip reads 数据 | 修改记录.
 *
 * Both items take their click here. The native one is an <a> aimed at the page it already shows, so
 * without preventDefault "back to the data" would be a no-op, and letting it navigate would reload
 * the embedded page.
 */
export function injectHistoryNavItem(
  root: ShadowRoot,
  label: string,
  onSelectData: () => void,
  onSelectHistory: () => void,
): boolean {
  const nav = root.querySelector(NAV_SELECTOR);
  const nativeItem = nav && (nav.querySelector('a') as HTMLAnchorElement | null);
  if (!nav || !nativeItem) {
    return false;
  }
  if (!nativeItem.getAttribute('data-history-bound')) {
    nativeItem.setAttribute('data-history-bound', 'true');
    // Remember the native classes so the current-tab marking can be handed back untouched.
    nativeItem.setAttribute('data-history-native-class', nativeItem.className || '');
    nativeItem.style.cursor = 'pointer';
    nativeItem.addEventListener('click', event => {
      event.preventDefault();
      onSelectData();
    });
  }
  if (!root.querySelector(`[data-test="${NAV_ITEM_ATTR}"]`)) {
    const item = nativeItem.cloneNode(false) as HTMLAnchorElement;
    item.setAttribute('data-test', NAV_ITEM_ATTR);
    item.removeAttribute('aria-current');
    item.removeAttribute('href');
    item.textContent = label;
    item.style.cursor = 'pointer';
    item.addEventListener('click', event => {
      event.preventDefault();
      onSelectHistory();
    });
    if (nativeItem.nextSibling) {
      nav.insertBefore(item, nativeItem.nextSibling);
    } else {
      nav.appendChild(item);
    }
  }
  return true;
}

/**
 * Marks whichever view is current. For the data view the native item's original classes are put back
 * exactly as they were, so the embedded page keeps owning its own appearance.
 */
export function setActiveTab(root: ShadowRoot, historyActive: boolean): void {
  const nav = root.querySelector(NAV_SELECTOR);
  if (!nav) {
    return;
  }
  Array.from(nav.querySelectorAll('a')).forEach(item => {
    const isHistory = item.getAttribute('data-test') === NAV_ITEM_ATTR;
    const classes = (item.className || '').split(/\s+/).filter(Boolean);
    const withoutActive = classes.filter(name => name !== ACTIVE_TAB_CLASS_FRAGMENT);
    if (isHistory) {
      item.className = (
        historyActive ? [...withoutActive, ACTIVE_TAB_CLASS_FRAGMENT] : withoutActive
      ).join(' ');
      if (historyActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
      return;
    }
    const original = item.getAttribute('data-history-native-class');
    if (historyActive) {
      item.className = withoutActive.join(' ');
      item.removeAttribute('aria-current');
    } else if (original !== null) {
      item.className = original;
      if (original.includes(ACTIVE_TAB_CLASS_FRAGMENT)) {
        item.setAttribute('aria-current', 'page');
      }
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
  // A cell is not always a plain span: some rows hold a switch, whose second cell is markup. Writing
  // only into an existing span left those rows showing the template's own text, which is how the
  // Secret page ended up reporting ???? as ?.
  const cellFor = (cell: Element): HTMLElement => {
    const existing = cell.querySelector('span');
    if (existing) {
      return existing as HTMLElement;
    }
    cell.textContent = '';
    const created = document.createElement('span');
    cell.appendChild(created);
    return created;
  };
  rows.forEach(row => {
    let item = list.querySelector(`li[data-test="${row.attr}"]`) as HTMLLIElement | null;
    if (!item) {
      item = template.cloneNode(true) as HTMLLIElement;
      item.setAttribute('data-test', row.attr);
      list.appendChild(item);
    }
    const cells = item.querySelectorAll('div');
    if (cells.length < 2) {
      return;
    }
    const label = cellFor(cells[0]);
    const value = cellFor(cells[1]);
    label.textContent = `${row.label}: `;
    value.textContent = row.value;
    value.setAttribute('title', row.value);
  });
}

interface HistorySummary {
  managedBy: string;
  managedByRef?: string;
  createdAt: string;
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
): { portal: React.ReactPortal | null } {
  const { cluster, namespace, name } = useParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<View>('data');
  const [summary, setSummary] = useState<HistorySummary | undefined>();
  const summaryRef = React.useRef<HistorySummary | undefined>(summary);
  summaryRef.current = summary;
  const close = useCallback(() => setView('data'), []);

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
      injectHistoryNavItem(
        root,
        label,
        () => setView('data'),
        () => setView('history'),
      );
    }, 800);
    return () => window.clearInterval(timer);
  }, [label]);

  useEffect(() => {
    const root = findWujieRoot();
    if (!root) {
      return;
    }
    const showingHistory = view === 'history';
    setNativeContentVisible(root, !showingHistory);
    setActiveTab(root, showingHistory);
    if (host) {
      host.style.display = showingHistory ? '' : 'none';
    }
  }, [view, host]);

  // Applied from the same retry loop as the tab: the embedded page re-renders as the user moves
  // inside it, so one shot is not enough. Every call is idempotent.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const root = findWujieRoot();
      const current = summaryRef.current;
      if (!root || !current) {
        return;
      }
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
    return { portal: null };
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
  };
}
