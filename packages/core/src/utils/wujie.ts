/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import WujieReact from 'wujie-react';

import { useEventEmitter } from '@ks-console/shared';
import { setGlobalConsoleV3LoadCompleted } from '../utils/globals.consoleV3LoadCompleted';
import { preloadConsoleV3MainAssetsForRoute } from './consoleV3AssetPreload';
import { resolveConsoleV3PreloadUrl, shouldPreloadConsoleV3 } from './consoleV3PreloadUrl';

const { setupApp, preloadApp, bus } = WujieReact;

export function initWujie() {
  const pathname = window.location.pathname;
  const deferActionsUntilListReady = shouldPreloadConsoleV3(pathname);

  let actionsPreloaded = false;
  const preloadActionsOnce = () => {
    if (actionsPreloaded) return;
    actionsPreloaded = true;
    preloadApp({
      name: 'consoleV3Actions',
      props: { actions: true },
      url: `//${window.location.host}/consolev3/dashboard`,
    });
  };

  const LIST_ACTIONS_PRELOAD_DELAY_MS = 2000;
  bus.$on('loadCompleted', (name: string) => {
    if (name !== 'consolev3') return;
    if (deferActionsUntilListReady) {
      window.setTimeout(preloadActionsOnce, LIST_ACTIONS_PRELOAD_DELAY_MS);
    }
    setGlobalConsoleV3LoadCompleted({ value: true });
  });

  setupApp({
    name: 'consolev3',
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

  setupApp({
    name: 'consoleV3Actions',
    url: `//${window.location.host}/consolev3/`,
    exec: true,
    props: { actions: true },
  });

  if (!deferActionsUntilListReady) {
    return;
  }

  preloadConsoleV3MainAssetsForRoute(pathname);
  preloadApp({
    name: 'consolev3',
    url: resolveConsoleV3PreloadUrl(pathname),
  });
}
