/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import WujieReact from 'wujie-react';

import { useEventEmitter } from '@ks-console/shared';
import { setGlobalConsoleV3LoadCompleted } from '../utils/globals.consoleV3LoadCompleted';
import {
  bindConsoleV3ListSeedEnsure,
  createConsoleV3ListSeedPlugin,
  ensureConsoleV3ListSeedInChild,
  installConsoleV3ListSeedPrimer,
  primeConsoleV3ListSeedForRoute,
} from './consoleV3ListSeed';
import { preloadConsoleV3MainAssetsForRoute } from './consoleV3AssetPreload';
import { isConsoleV3ProjectListPath, resolveConsoleV3PreloadUrl } from './consoleV3PreloadUrl';
import {
  createConsoleV3SpringCloudProbeCachePlugin,
  ensureSpringCloudProbeCacheInChild,
  primeSpringCloudProbeCacheForRoute,
} from './springcloudProbeCache';

const ensureChildFetchGuards = (appWindow: Window | undefined | null): void => {
  ensureConsoleV3ListSeedInChild(appWindow);
  ensureSpringCloudProbeCacheInChild(appWindow);
};

const { setupApp, preloadApp, bus } = WujieReact;

// The springcloud probe cache and list seed have to exist before the V3 bundle
// runs, both in the preload sandbox and on a fresh mount.
const consoleV3Plugins = [
  createConsoleV3SpringCloudProbeCachePlugin(),
  createConsoleV3ListSeedPlugin(),
];

export function initWujie() {
  // Runs before the V3 bundle download starts; the answers to V3's first
  // springcloud probe and first resource-list GET are usually ready by mount.
  primeSpringCloudProbeCacheForRoute();
  installConsoleV3ListSeedPrimer();
  bindConsoleV3ListSeedEnsure(ensureChildFetchGuards);
  primeConsoleV3ListSeedForRoute();
  // Overlap v3dist main css/js download with the consolev3 HTML BFF wait.
  preloadConsoleV3MainAssetsForRoute();

  const preloadUrl = resolveConsoleV3PreloadUrl(window.location.pathname);
  const deferActionsUntilListReady = isConsoleV3ProjectListPath(window.location.pathname);

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

  // Listen before any preload so list landings can start actions only after
  // consolev3 reports ready. A further fixed delay avoids racing late list
  // chunks / parse with a second V3 dashboard boot (idle callbacks used to
  // fire mid-boot; loadCompleted alone still starts too early).
  const LIST_ACTIONS_PRELOAD_DELAY_MS = 2000;
  bus.$on('loadCompleted', (name: string) => {
    if (name !== 'consolev3') return;
    // Schedule actions first so a missing `window.globals` cannot skip preload.
    if (deferActionsUntilListReady) {
      window.setTimeout(preloadActionsOnce, LIST_ACTIONS_PRELOAD_DELAY_MS);
    }
    setGlobalConsoleV3LoadCompleted({ value: true });
  });

  setupApp({
    name: 'consolev3',
    url: `//${window.location.host}/consolev3/`,
    exec: true,
    plugins: consoleV3Plugins,
    afterMount: appWindow => {
      // List/SPA fibers sometimes skip jsBeforeLoaders; patch fetch before V3
      // issues its first list/probe GET.
      ensureChildFetchGuards(appWindow);
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

  // Shared list app preloads the landing route when the host URL is already a
  // project embed, so activation does not pay for a dashboard → list navigation.
  preloadApp({
    name: 'consolev3',
    url: preloadUrl,
    plugins: consoleV3Plugins,
  });

  // Non-list routes keep the previous behaviour: warm actions immediately.
  if (!deferActionsUntilListReady) {
    preloadActionsOnce();
  }
}
