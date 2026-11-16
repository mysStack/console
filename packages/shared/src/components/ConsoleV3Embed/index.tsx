/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import {
  acceptsNativeConsoleV3Route,
  canonicalConsoleV3Path,
} from '../../utils/nativeConsoleV3Route';

interface EmbedProps {
  name?: string;
  url: string;
  width?: string;
  height?: string;
  afterMount?: (appWindow: Window) => void;
  activated?: (appWindow: Window) => void;
  deactivated?: (appWindow?: Window) => void;
  loadError?: (...args: any[]) => void;
  [key: string]: any;
}

type NativeChild = Window & { __WUJIE_UNMOUNT?: () => void; PopStateEvent: typeof PopStateEvent };
const bus = WujieReact.bus;
let options: Record<string, any> = {};
let frame: HTMLIFrameElement | undefined;
let activeDocument: Document | undefined;
let ready = false;
let failed = false;
let owner: ConsoleV3Embed | undefined;
let ownerVisible = false;
let expectedPath = '';
let suppressRoutes = false;
let modalVisible = false;
let modalObserved = false;
let resumeAfterModal = false;
let modalTimer: ReturnType<typeof setTimeout> | undefined;
let readyTimer: ReturnType<typeof setTimeout> | undefined;
let modalObserver: MutationObserver | undefined;
let positionFrameId: number | undefined;
let focusBeforeModal: HTMLElement | undefined;
const listeners: Array<[string, (...args: any[]) => void]> = [];

export function isNativeConsoleV3Enabled(): boolean {
  return (
    Boolean(frame) ||
    (globals.consoleEntry?.singleV3 === true && globals.consoleEntry?.nativeV3 === true)
  );
}

function childWindow(): NativeChild | undefined {
  try {
    const child = frame?.contentWindow as NativeChild | null;
    return child?.location.origin === window.location.origin ? child : undefined;
  } catch {
    return undefined;
  }
}

function clearChildListeners() {
  for (const [event, handler] of listeners.splice(0)) bus.$off(event, handler);
}

function resetDocument(child: Window, previous: Document) {
  if (child !== frame?.contentWindow || activeDocument !== previous) return;
  ready = false;
  activeDocument = undefined;
  if (frame) frame.dataset.nativeReady = 'false';
  clearChildListeners();
  modalObserver?.disconnect();
  modalVisible = false;
  modalObserved = false;
  focusBeforeModal = undefined;
  resumeAfterModal = false;
  if (modalTimer) clearTimeout(modalTimer);
  options.beforeLoad?.();
  armReadyTimeout();
}

function positionFrame() {
  positionFrameId = undefined;
  if (!frame) return;
  if (failed) {
    frame.dataset.nativePageMounted = 'false';
    frame.style.display = 'none';
    return;
  }
  const child = childWindow();
  const root = child?.document.getElementById('root');
  const bounds = owner?.slot.current?.getBoundingClientRect();
  ownerVisible = Boolean(bounds && bounds.width > 0 && bounds.height > 0);
  frame.dataset.nativePageMounted = String(ownerVisible);
  if (modalVisible) {
    frame.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;border:0;display:block;z-index:9999;background:transparent';
    if (child) {
      child.document.documentElement?.style.setProperty('background', 'transparent');
      child.document.body?.style.setProperty('background', 'transparent');
    }
    if (root) root.style.visibility = 'hidden';
    return;
  }
  root?.style.removeProperty('visibility');
  child?.document.documentElement?.style.removeProperty('background');
  child?.document.body?.style.removeProperty('background');
  if (!ownerVisible || !bounds) {
    frame.style.display = 'none';
    return;
  }
  frame.style.cssText = `position:fixed;left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;border:0;display:block;z-index:1;background:white`;
}

function queuePosition() {
  if (!frame || positionFrameId !== undefined) return;
  positionFrameId = window.requestAnimationFrame(positionFrame);
}

function checkModal() {
  const document = childWindow()?.document;
  if (!document?.body) return;
  const open =
    document.body.className.includes('ReactModal__Body--open') ||
    Array.from(document.querySelectorAll('[role="dialog"]')).some(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0;
    });
  if (open) {
    modalObserved = true;
    modalVisible = true;
    if (modalTimer) clearTimeout(modalTimer);
  } else if (modalObserved) {
    modalObserved = false;
    modalVisible = false;
    if (focusBeforeModal?.isConnected) focusBeforeModal.focus({ preventScroll: true });
    focusBeforeModal = undefined;
    if (resumeAfterModal && owner) {
      resumeAfterModal = false;
      activate(owner, false);
    }
  }
  queuePosition();
}

function observeModal() {
  const document = childWindow()?.document;
  if (!document?.body) return;
  modalObserver?.disconnect();
  modalObserver = new MutationObserver(checkModal);
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  checkModal();
}

function changeRoute(url: string) {
  const child = childWindow();
  if (!child || !ready) return;
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin)
    throw new Error('Resource route must share the console origin');
  const path = target.pathname + target.search + target.hash;
  if (child.location.pathname + child.location.search + child.location.hash === path) return;
  suppressRoutes = true;
  try {
    child.history.replaceState(child.history.state, '', path);
    child.dispatchEvent(new child.PopStateEvent('popstate', { state: child.history.state }));
  } finally {
    suppressRoutes = false;
  }
}

function activate(next: ConsoleV3Embed, first: boolean) {
  owner = next;
  expectedPath = new URL(next.props.url, window.location.origin).pathname;
  positionFrame();
  if (!ready) return;
  if (modalVisible) {
    resumeAfterModal = true;
    return;
  }
  changeRoute(next.props.url);
  const callback = first ? next.props.afterMount : next.props.activated || next.props.afterMount;
  callback?.(childWindow()!);
  const currentOwner = owner;
  window.requestAnimationFrame(() => {
    if (
      owner === currentOwner &&
      canonicalConsoleV3Path(childWindow()?.location.pathname || '') ===
        canonicalConsoleV3Path(expectedPath)
    )
      expectedPath = '';
  });
}

function failLoad() {
  if (readyTimer) clearTimeout(readyTimer);
  ready = false;
  failed = true;
  positionFrame();
  owner?.setState({ failed: true });
  owner?.props.loadError?.(options.url, new Error('Resource console initialization failed'));
}

function armReadyTimeout() {
  if (readyTimer) clearTimeout(readyTimer);
  readyTimer = setTimeout(() => {
    if (!ready) failLoad();
  }, 20_000);
}

function onReady(name: string) {
  if (name !== 'consolev3' || !frame || ready || frame.dataset.nativeReady !== 'true') return;
  ready = true;
  failed = false;
  if (readyTimer) clearTimeout(readyTimer);
  frame.dataset.nativeReady = 'true';
  observeModal();
  owner?.setState({ failed: false });
  options.afterMount?.(childWindow());
  if (owner) activate(owner, true);
}

function onAction() {
  if (!frame || !ready) return;
  focusBeforeModal = childWindow()?.document.activeElement as HTMLElement | undefined;
  modalVisible = true;
  modalObserved = false;
  positionFrame();
  if (modalTimer) clearTimeout(modalTimer);
  modalTimer = setTimeout(() => {
    if (!modalObserved) {
      modalVisible = false;
      positionFrame();
    }
  }, 10_000);
}

function ensureFrame(preload: Record<string, any> = {}) {
  const props = Object.assign(options.props || {}, preload.props || {});
  options = { ...options, ...preload, props };
  if (frame) return frame;
  const target = new URL(options.url || '/consolev3/dashboard', window.location.origin);
  if (target.origin !== window.location.origin)
    throw new Error('Resource console must share the console origin');
  frame = document.createElement('iframe');
  frame.dataset.nativeV3 = 'true';
  frame.dataset.nativePageMounted = 'false';
  frame.title = 'KubeSphere resources';
  frame.style.cssText = 'position:fixed;width:1px;height:1px;border:0;display:none';
  (window as any).__consoleV3NativeBridge = {
    props: options.props,
    bus,
    listeners,
    ownsFrame: (child: Window) => child === frame?.contentWindow,
    attach: (child: Window, document: Document) => {
      if (child === frame?.contentWindow) activeDocument = document;
    },
    resetDocument,
    markReady: (child: Window, document: Document) => {
      if (child !== frame?.contentWindow || activeDocument !== document) return false;
      frame.dataset.nativeReady = 'true';
      return true;
    },
    routeAccepted: (path: { pathname?: string }) => {
      const accepted = acceptsNativeConsoleV3Route({
        incomingPath: path?.pathname,
        currentPath: childWindow()?.location.pathname || '',
        expectedPath,
        visible: ownerVisible,
        suppressed: suppressRoutes,
      });
      if (accepted) expectedPath = '';
      return accepted;
    },
  };
  bus.$on('loadCompleted', onReady);
  bus.$on('triggerAction', onAction);
  window.addEventListener('resize', queuePosition);
  window.addEventListener('scroll', queuePosition, true);
  options.beforeLoad?.();
  armReadyTimeout();
  frame.addEventListener('error', failLoad);
  frame.addEventListener('load', () => {
    const child = childWindow();
    if (child && /^\/(?:login|logout)(?:\/|$)/.test(child.location.pathname)) {
      window.location.replace(
        '/login?referer=' + encodeURIComponent(window.location.pathname + window.location.search),
      );
      return;
    }
    observeModal();
  });
  frame.src = target.href;
  document.body.appendChild(frame);
  return frame;
}

function destroyNativeFrame() {
  const previous = childWindow();
  ownerVisible = false;
  suppressRoutes = true;
  ready = false;
  try {
    previous?.__WUJIE_UNMOUNT?.();
  } catch {}
  clearChildListeners();
  bus.$off('loadCompleted', onReady);
  bus.$off('triggerAction', onAction);
  window.removeEventListener('resize', queuePosition);
  window.removeEventListener('scroll', queuePosition, true);
  if (positionFrameId !== undefined) window.cancelAnimationFrame(positionFrameId);
  if (readyTimer) clearTimeout(readyTimer);
  if (modalTimer) clearTimeout(modalTimer);
  modalObserver?.disconnect();
  modalObserver = undefined;
  frame?.remove();
  frame = undefined;
  activeDocument = undefined;
  ready = false;
  failed = false;
  owner = undefined;
  ownerVisible = false;
  modalVisible = false;
  modalObserved = false;
  resumeAfterModal = false;
  expectedPath = '';
  focusBeforeModal = undefined;
  positionFrameId = undefined;
  suppressRoutes = false;
  delete (window as any).__consoleV3NativeBridge;
  options.beforeLoad?.();
  options.afterUnmount?.(previous);
}

export default class ConsoleV3Embed extends React.Component<EmbedProps, { failed: boolean }> {
  static bus = bus;
  static propTypes = WujieReact.propTypes;
  static setupApp(next: Record<string, any>) {
    if (next.name !== 'consolev3' || !isNativeConsoleV3Enabled())
      return WujieReact.setupApp(next as any);
    options = { ...options, ...next };
  }
  static preloadApp(next: Record<string, any>) {
    if (next.name !== 'consolev3' || !isNativeConsoleV3Enabled())
      return WujieReact.preloadApp(next as any);
    ensureFrame(next);
  }
  static destroyApp(name: string) {
    if (name !== 'consolev3' || !frame) return WujieReact.destroyApp(name);
    destroyNativeFrame();
  }
  state = { failed };
  slot = React.createRef<HTMLDivElement>();
  observer?: ResizeObserver;
  componentDidMount() {
    if (this.props.name !== 'consolev3' || !isNativeConsoleV3Enabled()) return;
    ensureFrame({ url: this.props.url, props: this.props.props });
    this.observer = new ResizeObserver(queuePosition);
    if (this.slot.current) this.observer.observe(this.slot.current);
    activate(this, !ready);
  }
  componentDidUpdate(previous: EmbedProps) {
    if (this.props.name !== 'consolev3' || !isNativeConsoleV3Enabled()) return;
    if (previous.url !== this.props.url) activate(this, false);
    queuePosition();
  }
  componentWillUnmount() {
    this.observer?.disconnect();
    if (owner !== this) return;
    this.props.deactivated?.(childWindow());
    owner = undefined;
    ownerVisible = false;
    expectedPath = '';
    positionFrame();
  }
  retry = () => {
    destroyNativeFrame();
    this.setState({ failed: false });
    ensureFrame({ url: this.props.url, props: this.props.props });
    activate(this, true);
  };
  render() {
    if (this.props.name !== 'consolev3' || !isNativeConsoleV3Enabled())
      return <WujieReact {...this.props} />;
    return (
      <div
        ref={this.slot}
        data-native-v3-slot
        style={{
          width: this.props.width || '100%',
          height: this.props.height || '100%',
          minHeight: 0,
        }}
      >
        {this.state.failed && (
          <div role="alert">
            {t('OPERATION_FAILED')} <button onClick={this.retry}>{t('RETRY')}</button>
          </div>
        )}
      </div>
    );
  }
}
