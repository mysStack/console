import React, { lazy, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  findConfigReferenceAction,
  findConfigReferenceEnvTabPane,
  findConfigReferenceContainerName,
  findConfigReferenceMountParent,
  findManualEnvScope,
  injectConfigReferenceEntry,
  readManualEnvNames,
} from './bridge';

const ConfigReferenceInline = lazy(() => import('./ConfigReferenceInline'));
const ConfigReferenceSummary = lazy(() => import('./ConfigReferenceSummary'));

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
  const appWindowRef = useRef<Window | undefined>();
  const inlineHostRef = useRef<HTMLElement | null>(null);
  const summaryHostRef = useRef<HTMLElement | null>(null);
  const [inlineHost, setInlineHost] = useState<HTMLElement | null>(null);
  const [summaryHost, setSummaryHost] = useState<HTMLElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summaryVariant, setSummaryVariant] = useState<'dialog' | 'envTab'>('dialog');
  const [activeContainerName, setActiveContainerName] = useState<string | undefined>();
  const [manualEnvNames, setManualEnvNames] = useState<string[]>([]);
  const envScopeRef = useRef<HTMLElement | undefined>();
  const inputHandlerRef = useRef<(() => void) | undefined>();

  const closeInline = useCallback(() => {
    const host = inlineHostRef.current;
    inlineHostRef.current = null;
    setInlineHost(null);
    host?.parentNode?.removeChild(host);
  }, []);

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = undefined;
    if (appWindowRef.current && inputHandlerRef.current) {
      appWindowRef.current.document.removeEventListener('input', inputHandlerRef.current, true);
    }
    inputHandlerRef.current = undefined;
    closeInline();
    summaryHostRef.current?.parentNode?.removeChild(summaryHostRef.current);
    summaryHostRef.current = null;
    setSummaryHost(null);
  }, [closeInline]);

  const afterMount = useCallback(
    (appWindow: Window) => {
      cleanup();
      if (!appWindow?.document) {
        return;
      }

      const applyEntry = () => {
        const action = findConfigReferenceAction(appWindow.document);
        const parent = findConfigReferenceMountParent(action);
        if (action) {
          setActiveContainerName(findConfigReferenceContainerName(appWindow.document));
        }
        // Prefer the container editor's action row. When the editor is closed,
        // fall back to the read-only 环境变量 tab: that page lists `env` only, so
        // an envFrom-only workload otherwise shows no variables at all.
        const envPane = parent ? null : findConfigReferenceEnvTabPane(appWindow.document);
        const mountPoint = parent || envPane;
        if (
          mountPoint &&
          (!summaryHostRef.current || !mountPoint.contains(summaryHostRef.current))
        ) {
          summaryHostRef.current?.parentNode?.removeChild(summaryHostRef.current);
          const summary = appWindow.document.createElement('div');
          summary.dataset.test = 'config-reference-summary-host';
          if (envPane) {
            envPane.insertBefore(summary, envPane.firstChild);
          } else {
            parent?.appendChild(summary);
          }
          summaryHostRef.current = summary;
          setSummaryHost(summary);
          setSummaryVariant(envPane ? 'envTab' : 'dialog');
        }
        envScopeRef.current = findManualEnvScope(action);
        setManualEnvNames(readManualEnvNames(envScopeRef.current) || []);
        injectConfigReferenceEntry(appWindow.document, t('CONFIG_REFERENCE'), () => {
          const currentAction = findConfigReferenceAction(appWindow.document);
          const currentParent = findConfigReferenceMountParent(currentAction);
          if (!currentAction || !currentParent) return;
          closeInline();
          setActiveContainerName(findConfigReferenceContainerName(appWindow.document));
          const host = appWindow.document.createElement('div');
          host.dataset.test = 'config-reference-inline-host';
          currentParent.appendChild(host);
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

      // Typing does not mutate the DOM tree, so the MutationObserver above
      // never fires for it. Capture input events to keep the conflict hints
      // in step with unsaved edits.
      const handleInput = () => {
        const next = readManualEnvNames(envScopeRef.current) || [];
        setManualEnvNames(previous =>
          previous.length === next.length && previous.every((envName, i) => envName === next[i])
            ? previous
            : next,
        );
      };
      appWindowRef.current = appWindow;
      inputHandlerRef.current = handleInput;
      appWindow.document.addEventListener('input', handleInput, true);
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
            manualEnvNames={manualEnvNames}
            workloadKind={
              module === 'deployments'
                ? 'Deployment'
                : module === 'statefulsets'
                  ? 'StatefulSet'
                  : 'DaemonSet'
            }
            onClose={closeInline}
            onSaved={() => setRefreshKey(value => value + 1)}
          />
        </React.Suspense>,
        inlineHost,
      )
    : null;

  const summary =
    summaryHost && !inlineHost
      ? createPortal(
          <React.Suspense fallback={null}>
            <ConfigReferenceSummary
              cluster={cluster || ''}
              namespace={namespace || ''}
              name={name || ''}
              module={module}
              containerName={activeContainerName}
              refreshKey={refreshKey}
              variant={summaryVariant}
            />
          </React.Suspense>,
          summaryHost,
        )
      : null;

  return { afterMount, afterUnmount: cleanup, inline, summary };
}
