import React, { lazy, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  findConfigReferenceAction,
  findConfigReferenceEnvSections,
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
  // One host per container card on the read-only environment tab, keyed by
  // container name so a re-render of the page does not move our block.
  const envHostsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [envHosts, setEnvHosts] = useState<
    Array<{ containerName: string; index: number; host: HTMLElement }>
  >([]);
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
    envHostsRef.current.forEach(host => host.parentNode?.removeChild(host));
    envHostsRef.current.clear();
    setEnvHosts([]);
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
        // While the container editor is open, one block goes under its action row.
        if (parent && (!summaryHostRef.current || !parent.contains(summaryHostRef.current))) {
          summaryHostRef.current?.parentNode?.removeChild(summaryHostRef.current);
          const summary = appWindow.document.createElement('div');
          summary.dataset.test = 'config-reference-summary-host';
          parent.appendChild(summary);
          summaryHostRef.current = summary;
          setSummaryHost(summary);
        }

        // Otherwise attach one block per container card on the read-only 环境变量
        // tab. That page renders a collapsible card per container and lists `env`
        // only, so a single page-level block would describe just the first
        // container of a multi-container pod.
        const sections = parent ? [] : findConfigReferenceEnvSections(appWindow.document);
        const present = new Set<string>();
        sections.forEach(section => {
          present.add(section.containerName);
          let host = envHostsRef.current.get(section.containerName);
          if (host && !section.card.contains(host)) {
            // The card was re-rendered: drop the stale host and build a new one.
            host.parentNode?.removeChild(host);
            envHostsRef.current.delete(section.containerName);
            host = undefined;
          }
          if (!host) {
            host = appWindow.document.createElement('div');
            host.dataset.test = 'config-reference-env-host';
            const heading = section.card.children[0];
            if (heading && heading.nextSibling) {
              section.card.insertBefore(host, heading.nextSibling);
            } else {
              section.card.appendChild(host);
            }
            envHostsRef.current.set(section.containerName, host);
          }
        });
        envHostsRef.current.forEach((host, containerName) => {
          if (!present.has(containerName)) {
            host.parentNode?.removeChild(host);
            envHostsRef.current.delete(containerName);
          }
        });
        const nextEnvHosts = sections
          .filter(section => envHostsRef.current.has(section.containerName))
          .map(section => ({
            containerName: section.containerName,
            index: section.index,
            host: envHostsRef.current.get(section.containerName) as HTMLElement,
          }));
        setEnvHosts(previous =>
          previous.length === nextEnvHosts.length &&
          previous.every((item, position) => item.host === nextEnvHosts[position].host)
            ? previous
            : nextEnvHosts,
        );
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

  const dialogSummary =
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
              variant="dialog"
            />
          </React.Suspense>,
          summaryHost,
        )
      : null;

  // The per-container blocks are returned in the same node the editor block uses,
  // so whatever renders `summary` renders them too.
  const containerSummaries = inlineHost
    ? []
    : envHosts.map((item, position) => (
        <React.Fragment key={`${item.containerName}-${item.index}-${position}`}>
          {createPortal(
            <React.Suspense fallback={null}>
              <ConfigReferenceSummary
                cluster={cluster || ''}
                namespace={namespace || ''}
                name={name || ''}
                module={module}
                containerName={item.containerName}
                containerIndex={item.index}
                refreshKey={refreshKey}
                variant="envTab"
              />
            </React.Suspense>,
            item.host,
          )}
        </React.Fragment>
      ));

  const summary = [dialogSummary, ...containerSummaries];

  return { afterMount, afterUnmount: cleanup, inline, summary };
}
