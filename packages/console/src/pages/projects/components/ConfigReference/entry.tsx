import React, { lazy, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  findConfigReferenceAction,
  findConfigReferenceContainerName,
  findConfigReferenceMountParent,
  injectConfigReferenceEntry,
} from './bridge';

const ConfigReferenceInline = lazy(() => import('./ConfigReferenceInline'));

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
  const { workspace, cluster, namespace, name } = useParams();
  const observerRef = useRef<MutationObserver | undefined>();
  const inlineHostRef = useRef<HTMLElement | null>(null);
  const [inlineHost, setInlineHost] = useState<HTMLElement | null>(null);
  const [activeContainerName, setActiveContainerName] = useState<string | undefined>();

  const closeInline = useCallback(() => {
    const host = inlineHostRef.current;
    inlineHostRef.current = null;
    setActiveContainerName(undefined);
    setInlineHost(null);
    host?.parentNode?.removeChild(host);
  }, []);

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = undefined;
    closeInline();
  }, [closeInline]);

  const afterMount = useCallback(
    (appWindow: Window) => {
      cleanup();
      if (!appWindow?.document) {
        return;
      }

      const applyEntry = () => {
        injectConfigReferenceEntry(appWindow.document, t('CONFIG_REFERENCE'), () => {
          const action = findConfigReferenceAction(appWindow.document);
          const parent = findConfigReferenceMountParent(action);
          if (!action || !parent) return;
          closeInline();
          setActiveContainerName(findConfigReferenceContainerName(appWindow.document));
          const host = appWindow.document.createElement('div');
          host.dataset.test = 'config-reference-inline-host';
          host.style.scrollMarginBottom = '100px';
          parent.appendChild(host);
          inlineHostRef.current = host;
          setInlineHost(host);
        });
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
    [cleanup, closeInline],
  );

  const inline = inlineHost
    ? createPortal(
        <React.Suspense fallback={<div data-test="config-reference-inline">正在加载配置引用…</div>}>
          <ConfigReferenceInline
            cluster={cluster || ''}
            namespace={namespace || ''}
            name={name || ''}
            module={module}
            containerName={activeContainerName}
            workloadKind={
              module === 'deployments'
                ? 'Deployment'
                : module === 'statefulsets'
                  ? 'StatefulSet'
                  : 'DaemonSet'
            }
            onClose={closeInline}
          />
        </React.Suspense>,
        inlineHost,
      )
    : null;

  return { afterMount, afterUnmount: cleanup, inline };
}
