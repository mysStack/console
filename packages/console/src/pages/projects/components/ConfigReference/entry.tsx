import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { injectConfigReferenceEntry } from './bridge';

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
  const navigate = useNavigate();
  const { workspace, cluster, namespace, name } = useParams();
  const observerRef = useRef<MutationObserver | undefined>();
  const path = useMemo(
    () => getConfigReferencePath({ workspace, cluster, namespace, module, name }),
    [workspace, cluster, namespace, module, name],
  );

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
        injectConfigReferenceEntry(appWindow.document, t('CONFIG_REFERENCE'), () => {
          navigate(path);
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
    [cleanup, navigate, path],
  );

  return { afterMount, afterUnmount: cleanup };
}
