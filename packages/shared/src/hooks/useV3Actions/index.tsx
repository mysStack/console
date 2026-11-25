/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import * as React from 'react';
import WujieReact from 'wujie-react';

const { bus } = WujieReact;

interface OpenParams {
  action?: string;
  v3Module: string;
  v3StoreParams: Record<string, any> | string;

  [key: string]: any;
}

type PendingAction = { action: string; restParams: Record<string, any> };

/**
 * Use Modals in consoleV3. Note that you need to specify action , v3Module , v3StoreParams etc.
 * v3Module needs to be registered in V3 code => src/stores/getStore.js.
 */
const ACTIONS_LAYER_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  width: '100%',
  height: '100%',
  background: 'transparent',
  pointerEvents: 'auto',
};

export const useV3action = () => {
  const [visible, setVisible] = React.useState(false);
  const pendingRef = React.useRef<PendingAction | null>(null);
  const timerRef = React.useRef<number>();

  React.useEffect(() => {
    const onActionModal = (open?: boolean) => {
      if (!open) {
        setVisible(false);
      }
    };
    bus.$on('v3ActionModal', onActionModal);
    return () => {
      bus.$off && bus.$off('v3ActionModal', onActionModal);
    };
  }, []);

  const flush = () => {
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    pendingRef.current = null;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    bus.$emit('triggerAction', pending.action, pending.restParams);
  };

  const open = (params: OpenParams) => {
    const { action = 'workload.template.edit', ...restParams } = params;
    pendingRef.current = { action, restParams };
    if (visible) {
      flush();
      return;
    }
    setVisible(true);
    timerRef.current = window.setTimeout(flush, 1000);
  };

  const render = (lifecycles?: { afterMount?: (appWindow: Window) => void }) => {
    if (!visible) {
      return null;
    }
    return (
      <div data-test="console-v3-actions-layer" style={ACTIONS_LAYER_STYLE}>
        <style>{`[data-test="console-v3-actions-layer"] wujie-app,[data-test="console-v3-actions-layer"] iframe{width:100%!important;height:100%!important;background:transparent;border:0}`}</style>
        <WujieReact
          width="100%"
          height="100%"
          name="consoleV3Actions"
          props={{ actions: true, name: 'consoleV3Actions' }}
          url={`//${window.location.host}/consolev3/dashboard`}
          sync={false}
          attrs={{ style: 'background:transparent;border:none;' }}
          afterMount={appWindow => {
            lifecycles?.afterMount?.(appWindow);
            flush();
          }}
        />
      </div>
    );
  };
  return { open, render };
};
