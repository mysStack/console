import React, { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectConfigReferenceEntry } from './bridge';

const ConfigReferenceDrawer = lazy(() => import('./ConfigReferenceDrawer'));

export type ConfigReferenceWorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

export interface ConfigReferencePathParams {
  workspace?: string;
  cluster?: string;
  namespace?: string;
  module: ConfigReferenceWorkloadModule;
  name?: string;
}

export function getConfigReferencePath({
  workspace = '',
  cluster = '',
  namespace = '',
  module,
  name = '',
}: ConfigReferencePathParams): string {
  return [
    workspace ? `/${workspace}` : '',
    `/clusters/${cluster}/projects/${namespace}/${module}/${name}/config-reference`,
  ].join('');
}

export function useConfigReferenceBridge(module: ConfigReferenceWorkloadModule) {
  const { cluster, namespace, name } = useParams();
  const observerRef = useRef<MutationObserver | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const workloadKind =
    module === 'statefulsets'
      ? 'StatefulSet'
      : module === 'daemonsets'
        ? 'DaemonSet'
        : 'Deployment';

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = undefined;
  }, []);

  const afterMount = useCallback(
    (appWindow: Window) => {
      cleanup();
      if (!appWindow?.document) {
        return;
      }

      const applyEntry = () => {
        injectConfigReferenceEntry(appWindow.document, t('CONFIG_REFERENCE'), () =>
          setDrawerOpen(true),
        );
      };

      applyEntry();
      const target = appWindow.document.body || appWindow.document.documentElement;
      if (!target) {
        return;
      }

      const Observer = appWindow.document.defaultView?.MutationObserver || MutationObserver;
      const observer = new Observer(applyEntry);
      observer.observe(target, { childList: true, subtree: true });
      observerRef.current = observer;
    },
    [cleanup],
  );

  const drawer = drawerOpen ? (
    <Suspense fallback={null}>
      <ConfigReferenceDrawer
        visible
        cluster={cluster || ''}
        namespace={namespace || ''}
        name={name || ''}
        module={module}
        workloadKind={workloadKind}
        onClose={() => setDrawerOpen(false)}
      />
    </Suspense>
  ) : null;

  return { afterMount, afterUnmount: cleanup, drawer };
}
