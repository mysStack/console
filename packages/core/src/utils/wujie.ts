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
import { isConsoleV3ProjectListPath, resolveConsoleV3PreloadUrl } from './consoleV3PreloadUrl';
import { installConsoleV3ProjectWarmup, warmLastConsoleV3Project } from './consoleV3ProjectWarmup';
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
  // Project layouts call this via window to prime CRD/seed and (off overview)
  // preload the deployments list without importing core from console.
  installConsoleV3ProjectWarmup({
    preloadApp: ({ name, url, plugins }) => {
      preloadApp({ name, url, plugins });
    },
    plugins: consoleV3Plugins,
  });

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
  // the shared consolev3 app has finished loading (not on a wall-clock delay).
  bus.$on('loadCompleted', (name: string) => {
    if (name !== 'consolev3') return;
    setGlobalConsoleV3LoadCompleted({ value: true });
    if (deferActionsUntilListReady) {
      preloadActionsOnce();
    }
    // Shell landed on dashboard/workbench: switch the warm sandbox to the last
    // project's deployments so the next SPA jump does not start from dashboard.
    if (!deferActionsUntilListReady) {
      warmLastConsoleV3Project();
    }
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
