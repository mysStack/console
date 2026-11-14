/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import WujieReact from 'wujie-react';

import { consoleV3Runtime, findConsoleV3Window, useEventEmitter } from '@ks-console/shared';
import { setGlobalConsoleV3LoadCompleted } from '../utils/globals.consoleV3LoadCompleted';

const { setupApp, preloadApp, bus } = WujieReact;

export function initWujie() {
  const singleV3 = globals.consoleEntry?.singleV3 === true;
  if (singleV3) {
    // The child announces readiness after its native action registry is loaded.
    bus.$on('loadCompleted', (name: string) => {
      if (name !== 'consolev3') return;
      const child = findConsoleV3Window(document);
      if (child) consoleV3Runtime.markReady(child);
      setGlobalConsoleV3LoadCompleted({ value: true });
    });
  }
  setupApp({
    name: 'consolev3',
    ...(singleV3
      ? {
          alive: true,
          props: { actions: true, name: 'consolev3' },
          beforeLoad: () => consoleV3Runtime.reset(),
        }
      : {}),
    url: `//${window.location.host}/consolev3/`,
    exec: true,
    afterMount: appWindow => {
      const { $emit } = useEventEmitter();
      $emit('afterMountConsoleV3', appWindow);
    },
    afterUnmount: appWindow => {
      const { $emit } = useEventEmitter();
      $emit('afterUnmountConsoleV3', appWindow);
    },
  });

  if (!singleV3)
    setupApp({
      name: 'consoleV3Actions',
      url: `//${window.location.host}/consolev3/`,
      exec: true,
      props: { actions: true },
      afterMount: () => {
        bus.$on('loadCompleted', (name: string) => {
          if (name === 'consolev3') {
            setGlobalConsoleV3LoadCompleted({ value: true });
          }
        });
      },
    });

  // Login and confirmation pages have no authenticated console bootstrap.
  // Their protected V3 preload redirects back to the V4 login document.
  if (!globals.user?.username || !globals.ksConfig) return;

  if (!singleV3)
    preloadApp({
      name: 'consoleV3Actions',
      props: { actions: true },
      url: `//${window.location.host}/consolev3/dashboard`,
    });

  preloadApp({
    name: 'consolev3',
    ...(singleV3 ? { alive: true, props: { actions: true, name: 'consolev3' } } : {}),
    url: `//${window.location.host}/consolev3/dashboard`,
  });
}
