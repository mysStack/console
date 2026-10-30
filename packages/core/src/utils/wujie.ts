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

  const preloadUrl = resolveConsoleV3PreloadUrl(window.location.pathname);

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
    afterMount: () => {
      bus.$on('loadCompleted', (name: string) => {
        if (name === 'consolev3') {
          setGlobalConsoleV3LoadCompleted({ value: true });
        }
      });
    },
  });

  // Shared list app preloads the landing route when the host URL is already a
  // project embed, so activation does not pay for a dashboard → list navigation.
  preloadApp({
    name: 'consolev3',
    url: preloadUrl,
    plugins: consoleV3Plugins,
  });

  // Actions stay on dashboard. On a list hard refresh, kicking that preload in
  // the same turn races the aligned list fiber for HTML + v3dist bandwidth.
  const preloadActions = () =>
    preloadApp({
      name: 'consoleV3Actions',
      props: { actions: true },
      url: `//${window.location.host}/consolev3/dashboard`,
    });
  if (isConsoleV3ProjectListPath(window.location.pathname)) {
    // Fixed delay — requestIdleCallback often fires during the same cold-boot
    // idle gaps and still races the list fiber for `/consolev3/dashboard`.
    window.setTimeout(preloadActions, 2500);
  } else {
    preloadActions();
  }
}
