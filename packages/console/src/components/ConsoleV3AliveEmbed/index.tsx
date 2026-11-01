/*
 * Please refer to the LICENSE file in the root of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useRef } from 'react';
import WujieReact from 'wujie-react';

import { watchConsoleV3Sandbox } from '../ConsoleV3ResourceList/keepAlive';
import type { ConsoleV3AppWindow } from '../ConsoleV3ResourceList/metrics';
import { scheduleConsoleV3ListRouteSync } from '../ConsoleV3ResourceList/route';

export interface ConsoleV3AliveEmbedProps {
  url: string;
  width?: string;
  height?: string;
  afterMount?: (appWindow: Window) => void;
  afterUnmount?: (appWindow?: Window) => void;
  activated?: (appWindow: Window) => void;
}

/**
 * Shared V3 detail/page embed that reuses the persistent `consolev3` Wujie app.
 *
 * Leaving a non-alive embed clears the ShadowRoot. The next list or overview
 * activate then hits an empty husk and pays a full cold boot. Keep the sandbox
 * alive and sync the child router onto this embed's URL on mount/activate.
 *
 * Wujie only runs `afterUnmount` when `!alive`. Alive embeds emit `deactivated`
 * instead, so callers that clean up bridges (ConfigReference listeners, etc.)
 * must run on deactivated and on React unmount.
 */
export default function ConsoleV3AliveEmbed({
  url,
  width = '100%',
  height = '100%',
  afterMount,
  afterUnmount,
  activated,
}: ConsoleV3AliveEmbedProps): JSX.Element {
  const afterUnmountRef = useRef(afterUnmount);
  afterUnmountRef.current = afterUnmount;

  useEffect(
    () => () => {
      afterUnmountRef.current?.();
    },
    [],
  );

  const bindSandbox = useCallback(
    (appWindow?: Window) => {
      const child = appWindow as ConsoleV3AppWindow | undefined;
      watchConsoleV3Sandbox(child?.__WUJIE);
      if (child) {
        scheduleConsoleV3ListRouteSync(child, url);
      }
    },
    [url],
  );

  return (
    <WujieReact
      width={width}
      height={height}
      name="consolev3"
      url={url}
      alive
      sync={false}
      afterMount={appWindow => {
        bindSandbox(appWindow);
        if (appWindow) {
          afterMount?.(appWindow);
        }
      }}
      activated={appWindow => {
        bindSandbox(appWindow);
        if (appWindow) {
          activated?.(appWindow);
        }
      }}
      deactivated={appWindow => {
        afterUnmount?.(appWindow);
      }}
      afterUnmount={afterUnmount}
    />
  );
}
