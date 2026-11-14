/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import * as React from 'react';
import WujieReact from 'wujie-react';
import { Loading, notify } from '@kubed/components';
import { consoleV3Runtime } from '../../utils/consoleV3Runtime';

const { bus } = WujieReact;

interface OpenParams {
  action?: string;
  v3Module: string;
  v3StoreParams: Record<string, any> | string;
  [key: string]: any;
}

type Lifecycles = { afterMount?: (appWindow: Window) => void };
type PendingAction = { params: OpenParams; path: string; timer: number };
const INITIALIZATION_TIMEOUT_MS = 20_000;

/** Reuse the page runtime for native modals when singleV3 is explicitly enabled. */
export const useV3action = () => {
  const singleV3 = globals.consoleEntry?.singleV3 === true;
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [mountGeneration, setMountGeneration] = React.useState(0);
  const pending = React.useRef<PendingAction>();
  const callbacks = React.useRef<Lifecycles>();
  const dispatch = React.useRef<() => void>();
  const mounted = React.useRef(true);
  const legacyTimers = React.useRef(new Set<number>());
  const currentPath = () => window.location.pathname + window.location.search;

  const cancelPending = (failed = false) => {
    const queued = pending.current;
    pending.current = undefined;
    if (!queued) return;
    window.clearTimeout(queued.timer);
    setLoading(false);
    queued.params.onCancel?.();
    if (failed) notify.error(t('OPERATION_FAILED'));
  };

  const flush = () => {
    const queued = pending.current;
    if (!queued || !mounted.current) return;
    if (queued.path !== currentPath()) {
      cancelPending();
      return;
    }
    const child = consoleV3Runtime.getReadyWindow();
    if (!child || !document.querySelector('wujie-app[data-wujie-id="consolev3"]')) return;
    pending.current = undefined;
    window.clearTimeout(queued.timer);
    setLoading(false);
    // The configuration-reference bridge must bind the actual page/form root
    // before the native action creates its modal.
    callbacks.current?.afterMount?.(child);
    const { action = 'workload.template.edit', ...rest } = queued.params;
    bus.$emit('triggerAction', action, rest);
  };
  dispatch.current = flush;

  React.useEffect(() => {
    mounted.current = true;
    const unsubscribe = consoleV3Runtime.subscribe(() => dispatch.current?.());
    return () => {
      mounted.current = false;
      unsubscribe();
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = undefined;
      for (const timer of legacyTimers.current) window.clearTimeout(timer);
      legacyTimers.current.clear();
    };
  }, []);

  const open = (params: OpenParams) => {
    if (!mounted.current) return;
    if (!singleV3) {
      const { action = 'workload.template.edit', ...rest } = params;
      const timer = window.setTimeout(
        () => {
          legacyTimers.current.delete(timer);
          bus.$emit('triggerAction', action, rest);
        },
        visible ? 0 : 1000,
      );
      legacyTimers.current.add(timer);
      setVisible(true);
      return;
    }
    if (pending.current) return;
    pending.current = {
      params,
      path: currentPath(),
      timer: window.setTimeout(() => cancelPending(true), INITIALIZATION_TIMEOUT_MS),
    };
    setLoading(true);
    if (!document.querySelector('wujie-app[data-wujie-id="consolev3"]')) {
      // A V4 page can reactivate the already booted app in a zero-size host.
      // A fresh key also handles a previous host whose ShadowRoot moved to a list.
      setVisible(true);
      setMountGeneration(value => value + 1);
    }
    flush();
  };

  const render = (lifecycles?: Lifecycles) => {
    callbacks.current = lifecycles;
    if (!singleV3) {
      return visible ? (
        <WujieReact
          width="0"
          height="0"
          name="consoleV3Actions"
          url={`//${window.location.host}/consolev3/dashboard`}
          sync={false}
          {...lifecycles}
        />
      ) : null;
    }
    return (
      <>
        {loading && <Loading style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />}
        {visible && (
          <div data-console-v3-actions-host style={{ width: 0, height: 0 }}>
            <WujieReact
              key={mountGeneration}
              width="0"
              height="0"
              name="consolev3"
              props={{ actions: true, name: 'consolev3' }}
              alive
              url={`//${window.location.host}/consolev3/dashboard`}
              sync={false}
              afterMount={flush}
              activated={flush}
              loadError={() => cancelPending(true)}
            />
          </div>
        )}
      </>
    );
  };
  return { open, render };
};
