/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';

import ConfigHistoryPage from './index';
import { EventsView, MetadataView } from './views';

/**
 * The history, plus the two views the design puts beside it, rendered inside the ConfigMap / Secret
 * page as peers of the page's own tab.
 *
 *  数据      the page's own content
 *  修改记录  the modification history
 *  元数据    the object's labels and annotations
 *  事件      the object's events
 *
 * The design (mockup-cm-history.html) draws all four. The embedded page has only one native tab, so
 * three are injected here; the 资源状态 tab the mockup shows for workloads has no counterpart on these
 * pages and is replaced by the native 数据 one.
 *
 * Measured, and the measurement drives the strip handling: the ConfigMap and Secret detail pages have
 * exactly one native tab. Searching the wujie shadow root and both iframes for 元数据 and 事件 finds
 * nothing, which is why those views are built here rather than borrowed.
 *
 *   div.detail-page
 *     div.detail-page-sider   property column, holds [data-test="detail-attrs"]
 *     div.detail-page-content content area, holds div.detail-page-nav
 * The native tab is an <a> aiming at the page it is already on, so every click is taken over with
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
const NEW_BADGE_ATTR = 'config-history-badge';

type View = 'data' | 'history' | 'metadata' | 'events';

/** The three views added beside the page's own tab, in the order the design draws them. */
const VIEW_ITEMS: Array<{ key: Exclude<View, 'data'>; label: string; badge?: string }> = [
  { key: 'history', label: '修改记录', badge: '新' },
  { key: 'metadata', label: '元数据' },
  { key: 'events', label: '事件' },
];

function findWujieRoot(): ShadowRoot | undefined {
  const app = document.querySelector('wujie-app');
  return (app && app.shadowRoot) || undefined;
}

/** The host element the views render into, created once inside the content area. */
export function ensureHistoryHost(root: ShadowRoot): HTMLElement | undefined {
  const content = root.querySelector(CONTENT_SELECTOR) as HTMLElement | null;
  if (!content) {
    return undefined;
  }
  let host = content.querySelector(`[data-test="${HOST_TEST_ATTR}"]`) as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-test', HOST_TEST_ATTR);
    content.appendChild(host);
  }
  return host;
}

/**
 * Hides what sits beside the host while something other than the page's own data is shown, and
 * restores it for the data view. The tab strip is skipped entirely -- not its children, the strip
 * itself -- because an earlier version treated the strip as a wrapper and hid the tabs, leaving an
 * empty bar.
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
 * Adds the three items to the page's own strip, directly after the native tab, so it reads
 * 数据 | 修改记录 | 元数据 | 事件. Every click is taken over here: the native tab is an <a> aimed at
 * the page it already shows, so without preventDefault "back to the data" would be a no-op.
 */
export function injectHistoryNavItem(root: ShadowRoot, onSelect: (view: View) => void): boolean {
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
      onSelect('data');
    });
  }
  VIEW_ITEMS.forEach((entry, index) => {
    const attr = `${NAV_ITEM_ATTR}-${entry.key}`;
    if (nav.querySelector(`[data-test="${attr}"]`)) {
      return;
    }
    const item = nativeItem.cloneNode(false) as HTMLAnchorElement;
    item.setAttribute('data-test', attr);
    item.setAttribute(NAV_ITEM_ATTR, entry.key);
    item.removeAttribute('aria-current');
    item.removeAttribute('href');
    item.style.cursor = 'pointer';
    item.textContent = entry.label;
    if (entry.badge) {
      const badge = document.createElement('span');
      badge.setAttribute('data-test', NEW_BADGE_ATTR);
      badge.textContent = entry.badge;
      badge.style.cssText =
        'margin-left:6px;background:#f5a623;color:#fff;font-size:9px;line-height:1;padding:2px 4px;border-radius:4px;vertical-align:middle';
      item.appendChild(badge);
    }
    item.addEventListener('click', event => {
      event.preventDefault();
      onSelect(entry.key);
    });
    // Kept in the design's order: the first goes right after the native tab, the rest follow it.
    const anchor = index === 0 ? nativeItem.nextSibling : nav.children[nav.children.length - 1];
    if (anchor) {
      nav.insertBefore(item, anchor);
    } else {
      nav.appendChild(item);
    }
  });
  return true;
}

/**
 * Marks whichever view is current. For the data view the native item's original classes are put back
 * exactly as they were, so the embedded page keeps owning its own appearance.
 */
export function setActiveTab(root: ShadowRoot, active: View): void {
  const nav = root.querySelector(NAV_SELECTOR);
  if (!nav) {
    return;
  }
  Array.from(nav.querySelectorAll('a')).forEach(item => {
    const mine = item.getAttribute(NAV_ITEM_ATTR);
    const classes = (item.className || '').split(/\s+/).filter(Boolean);
    const withoutActive = classes.filter(name => name !== ACTIVE_TAB_CLASS_FRAGMENT);
    if (mine) {
      const isActive = mine === active;
      item.className = (
        isActive ? [...withoutActive, ACTIVE_TAB_CLASS_FRAGMENT] : withoutActive
      ).join(' ');
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
      return;
    }
    const original = item.getAttribute('data-history-native-class');
    if (active !== 'data') {
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
  // only into an existing span left those rows showing the template's own text.
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
      injectHistoryNavItem(root, nextView => setView(nextView));
    }, 800);
    return () => window.clearInterval(timer);
  }, [label]);

  useEffect(() => {
    const root = findWujieRoot();
    if (!root) {
      return;
    }
    const showingOwnData = view === 'data';
    setNativeContentVisible(root, showingOwnData);
    setActiveTab(root, view);
    if (host) {
      host.style.display = showingOwnData ? 'none' : '';
    }
  }, [view, host]);

  // Applied from the same retry loop as the tabs: the embedded page re-renders as the user moves
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
          label: '变更来源',
          value: managedByLabel(current),
        },
        {
          attr: UPDATED_AT_ATTR,
          label: '更新时间',
          value: current.createdAt ? formatTime(current.createdAt) : '-',
        },
      ]);
    }, 800);
    return () => window.clearInterval(timer);
  }, [managedByLabel, formatTime]);

  if (!host) {
    return { portal: null };
  }
  const common = { cluster: cluster || '', namespace: namespace || '', name: name || '', kind };
  return {
    portal: createPortal(
      <>
        <div style={{ display: view === 'history' ? '' : 'none' }}>
          <ConfigHistoryPage
            kind={kind}
            cluster={common.cluster}
            namespace={common.namespace}
            name={common.name}
            onBack={close}
            onLoaded={setSummary}
          />
        </div>
        <div style={{ display: view === 'metadata' ? '' : 'none' }}>
          <MetadataView {...common} />
        </div>
        <div style={{ display: view === 'events' ? '' : 'none' }}>
          <EventsView cluster={common.cluster} namespace={common.namespace} name={common.name} />
        </div>
      </>,
      host,
    ),
  };
}
