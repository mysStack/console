import React, { lazy, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { request, useV3action, workloadStore } from '@ks-console/shared';
import { notify } from '@kubed/components';
import { createConfigReferenceDraftSession } from './draft';
import { createConfigReferenceNativeCallbacks } from './nativeEdit';
import type { ConfigReferenceWorkloadModule } from './path';
export { getConfigReferencePath } from './path';
export type { ConfigReferencePathParams, ConfigReferenceWorkloadModule } from './path';
import {
  ConfigReferenceDomRoot,
  findConfigReferenceAction,
  findConfigReferenceEnvSections,
  findConfigReferenceContainerName,
  findConfigReferenceMountParent,
  findManualEnvScope,
  injectConfigReferenceEntry,
  installConfigReferenceNativeEdit,
  readManualEnvNames,
} from './bridge';

const ConfigReferenceInline = lazy(() => import('./ConfigReferenceInline'));
const ConfigReferenceSummary = lazy(() => import('./ConfigReferenceSummary'));

export function useConfigReferenceBridge(module: ConfigReferenceWorkloadModule) {
  const { cluster, namespace, name } = useParams();
  const actions = useV3action();
  const sessionRef = useRef<ReturnType<typeof createConfigReferenceDraftSession>>();
  const mainWindowRef = useRef<Window>();
  const actionWindowRef = useRef<Window>();
  const openEditorRef = useRef<() => void>();
  const openingRef = useRef(false);
  const removeEditListenerRef = useRef<() => void>();
  const removeConfirmationListenerRef = useRef<() => void>();
  const [draftVersion, setDraftVersion] = useState(0);
  const observerRef = useRef<MutationObserver | undefined>();
  const domRootRef = useRef<ConfigReferenceDomRoot | undefined>();
  const inlineHostRef = useRef<HTMLElement | null>(null);
  const summaryHostRef = useRef<HTMLElement | null>(null);
  const [inlineHost, setInlineHost] = useState<HTMLElement | null>(null);
  const [summaryHost, setSummaryHost] = useState<HTMLElement | null>(null);
  const refreshKey = 0;
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
    removeEditListenerRef.current?.();
    removeEditListenerRef.current = undefined;
    removeConfirmationListenerRef.current?.();
    removeConfirmationListenerRef.current = undefined;
    if (domRootRef.current && inputHandlerRef.current) {
      domRootRef.current.removeEventListener('input', inputHandlerRef.current, true);
    }
    domRootRef.current = undefined;
    inputHandlerRef.current = undefined;
    closeInline();
    summaryHostRef.current?.parentNode?.removeChild(summaryHostRef.current);
    summaryHostRef.current = null;
    setSummaryHost(null);
    envHostsRef.current.forEach(host => host.parentNode?.removeChild(host));
    envHostsRef.current.clear();
    setEnvHosts([]);
  }, [closeInline]);

  const bindRoot = useCallback(
    (appWindow: Window, appName: 'consolev3' | 'consoleV3Actions') => {
      cleanup();
      if (!appWindow?.document) {
        return;
      }
      const app = document.querySelector(`wujie-app[data-wujie-id="${appName}"]`);
      const root = app?.shadowRoot || appWindow.document;
      const rootDocument = (root as ShadowRoot).ownerDocument || (root as Document);
      // Empty env bodies are absolutely positioned by V3. Only when envFrom
      // contributes content, put that body back into normal flow and suppress its
      // text placeholder. Keep V3's display rule untouched: it owns collapse.
      if (!root.querySelector('[data-test="config-reference-env-layout"]')) {
        const style = rootDocument.createElement('style');
        style.dataset.test = 'config-reference-env-layout';
        style.textContent = `
          [data-config-reference-empty="true"]:has([data-test="config-reference-summary"]) {
            position: static !important; transform: none !important;
            height: auto !important; min-height: 0 !important; width: auto !important;
            font-size: 0 !important; padding-top: 20px;
          }
          [data-test="config-reference-env-host"] { width: 100%; font-size: 12px; }
          div:has(> [data-test="config-reference-env-host"]) { flex-direction: column; }
        `;
        (root instanceof ShadowRoot ? root : root.head).appendChild(style);
      }

      let editingContainer: string | undefined;
      let containerIntent: 'confirm' | 'cancel' | undefined;
      const trackContainer = () => {
        const session = sessionRef.current;
        if (appName !== 'consoleV3Actions' || !session) return;
        const current = findConfigReferenceContainerName(root);
        if (current === editingContainer) return;
        if (editingContainer) {
          if (!current && containerIntent === 'confirm') session.confirmContainer();
          else session.cancelContainer();
          closeInline();
        }
        if (current) session.beginContainer(current);
        editingContainer = current;
        containerIntent = undefined;
        setActiveContainerName(current);
        setDraftVersion(value => value + 1);
      };
      const applyEntry = () => {
        trackContainer();
        const action = findConfigReferenceAction(root);
        const parent = findConfigReferenceMountParent(action);
        if (action) {
          setActiveContainerName(findConfigReferenceContainerName(root));
        }
        if (!parent && summaryHostRef.current) {
          summaryHostRef.current.remove();
          summaryHostRef.current = null;
          setSummaryHost(null);
        }
        // While the container editor is open, one block goes under its action row.
        if (parent && (!summaryHostRef.current || !parent.contains(summaryHostRef.current))) {
          summaryHostRef.current?.parentNode?.removeChild(summaryHostRef.current);
          const summary = rootDocument.createElement('div');
          summary.dataset.test = 'config-reference-summary-host';
          parent.appendChild(summary);
          summaryHostRef.current = summary;
          setSummaryHost(summary);
        }

        // Otherwise attach one block per container card on the read-only 环境变量
        // tab. That page renders a collapsible card per container and lists `env`
        // only, so a single page-level block would describe just the first
        // container of a multi-container pod.
        const sections = parent ? [] : findConfigReferenceEnvSections(root);
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
            host = rootDocument.createElement('div');
            host.dataset.test = 'config-reference-env-host';
            // Never insert a third sibling into the native card: V3 hides its
            // last child on collapse. Both env and envFrom must share that body.
            if (!section.body.children.length) {
              section.body.dataset.configReferenceEmpty = 'true';
            }
            section.body.appendChild(host);
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
        const nextNames = readManualEnvNames(envScopeRef.current) || [];
        setManualEnvNames(previous =>
          previous.length === nextNames.length &&
          previous.every((value, i) => value === nextNames[i])
            ? previous
            : nextNames,
        );
        injectConfigReferenceEntry(root, t('CONFIG_REFERENCE'), () => {
          const currentAction = findConfigReferenceAction(root);
          const currentParent = findConfigReferenceMountParent(currentAction);
          if (!currentAction || !currentParent) return;
          // A form opened through an unsupported path must never fall back to
          // early PATCH or borrow another container's references.
          if (!sessionRef.current) {
            notify.error(t('CONFIG_REFERENCE_CONTAINER_UNAVAILABLE'));
            return;
          }
          closeInline();
          setActiveContainerName(findConfigReferenceContainerName(root));
          const host = rootDocument.createElement('div');
          host.dataset.test = 'config-reference-inline-host';
          currentParent.appendChild(host);
          inlineHostRef.current = host;
          setInlineHost(host);
        });
      };

      if (appName === 'consolev3') {
        removeEditListenerRef.current = installConfigReferenceNativeEdit(root, () =>
          openEditorRef.current?.(),
        );
      } else {
        const handleConfirmation = (event: Event) => {
          const target = event.target as Element | null;
          const confirmation = target?.closest(
            '[data-test="confirm-ok"], [data-test="confirm-cancel"]',
          );
          const session = sessionRef.current;
          if (!session) return;
          if (confirmation) {
            const confirmed = confirmation.getAttribute('data-test') === 'confirm-ok';
            if (findConfigReferenceContainerName(root)) {
              // Validation may leave the inner editor open. Promote its draft
              // only once the native editor actually leaves that container.
              containerIntent = confirmed ? 'confirm' : 'cancel';
            } else if (confirmed) {
              session.confirmGroup();
            } else {
              session.cancelGroup();
              setDraftVersion(value => value + 1);
            }
          } else if (target?.closest('li[data-name]')) {
            // Native tab switching discards the unconfirmed subform.
            session.cancelGroup();
            containerIntent = 'cancel';
            closeInline();
            setDraftVersion(value => value + 1);
          }
        };
        root.addEventListener('click', handleConfirmation, true);
        removeConfirmationListenerRef.current = () =>
          root.removeEventListener('click', handleConfirmation, true);
      }

      applyEntry();
      const target = root;
      if (!target) {
        return;
      }

      const Observer = rootDocument.defaultView?.MutationObserver || MutationObserver;
      const observer = new Observer(applyEntry);
      observer.observe(target, { childList: true, subtree: true });
      observerRef.current = observer;

      // Typing does not mutate the DOM tree, so the MutationObserver above
      // never fires for it. Capture input events to keep the conflict hints
      // in step with unsaved edits.
      const handleInput = () => {
        trackContainer();
        if (findConfigReferenceAction(root)) {
          setActiveContainerName(findConfigReferenceContainerName(root));
        }
        const next = readManualEnvNames(envScopeRef.current) || [];
        setManualEnvNames(previous =>
          previous.length === next.length && previous.every((envName, i) => envName === next[i])
            ? previous
            : next,
        );
      };
      domRootRef.current = root;
      inputHandlerRef.current = handleInput;
      root.addEventListener('input', handleInput, true);
    },
    [cleanup, closeInline],
  );

  const afterMount = useCallback(
    (appWindow: Window) => {
      mainWindowRef.current = appWindow;
      bindRoot(appWindow, 'consolev3');
    },
    [bindRoot],
  );
  const afterActionMount = useCallback(
    (appWindow: Window) => {
      actionWindowRef.current = appWindow;
      if (sessionRef.current) bindRoot(appWindow, 'consoleV3Actions');
    },
    [bindRoot],
  );
  const afterUnmount = useCallback(() => {
    cleanup();
    mainWindowRef.current = undefined;
  }, [cleanup]);
  const finishSession = () => {
    sessionRef.current = undefined;
    openingRef.current = false;
    setDraftVersion(value => value + 1);
    if (mainWindowRef.current) bindRoot(mainWindowRef.current, 'consolev3');
  };
  openEditorRef.current = async () => {
    if (openingRef.current || sessionRef.current) return;
    openingRef.current = true;
    try {
      const origin = await request.get(
        workloadStore(module).getDetailUrl({ cluster, namespace, name }),
      );
      const detail = { _originData: origin, cluster, namespace, name };
      const session = createConfigReferenceDraftSession(origin);
      sessionRef.current = session;
      setDraftVersion(value => value + 1);
      const callbacks = createConfigReferenceNativeCallbacks({
        detail,
        getChanges: session.getSubmittedChanges,
        onSaved: () => {
          finishSession();
          notify.success(t('CONFIG_REFERENCE_SAVE_SUCCESS'));
          // Only after the complete native update succeeds; never reload to
          // hide a failed save or an abandoned local draft.
          window.location.reload();
        },
        onCancelled: finishSession,
        onError: () => notify.error(t('CONFIG_REFERENCE_SAVE_FAILED')),
      });
      if (actionWindowRef.current) bindRoot(actionWindowRef.current, 'consoleV3Actions');
      actions.open({
        action: 'workload.template.edit',
        v3Module: 'workload',
        v3StoreParams: module,
        cluster,
        namespace,
        name,
        detail,
        supportGpuSelect: true,
        ...callbacks,
      });
    } catch {
      finishSession();
      notify.error(t('CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR'));
    }
  };
  const draftSource = useMemo(
    () => sessionRef.current?.getSource(activeContainerName || ''),
    // The session is deliberately not React state. Its revision invalidates
    // this immutable snapshot without reseeding inputs on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeContainerName, draftVersion],
  );

  const inline = inlineHost
    ? createPortal(
        <React.Suspense fallback={<div data-test="config-reference-inline">正在加载配置引用…</div>}>
          <ConfigReferenceInline
            key={activeContainerName || 'unidentified-container'}
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
            draftSource={draftSource}
            onApplyDraft={change => {
              sessionRef.current?.stage(change);
              setDraftVersion(value => value + 1);
            }}
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
              draftSource={draftSource}
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
                containerCount={envHosts.length}
                refreshKey={refreshKey}
                variant="envTab"
              />
            </React.Suspense>,
            item.host,
          )}
        </React.Fragment>
      ));

  const summary = [dialogSummary, ...containerSummaries];

  return {
    afterMount,
    afterUnmount,
    inline: (
      <>
        {inline}
        {actions.render({ afterMount: afterActionMount })}
      </>
    ),
    summary,
  };
}
