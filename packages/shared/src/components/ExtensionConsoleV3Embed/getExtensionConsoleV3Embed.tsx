import React, { useEffect, useState } from 'react';
import { notify } from '@kubed/components';
import WujieReact from '../ConsoleV3Embed/index';
import { buildExtensionV3Document, extensionV3Paths } from './extensionV3Assets';

interface Options {
  name: string;
  baseUrl: string;
}

interface ActionParams {
  action: string;
  onCancel?: () => void;
  [key: string]: any;
}

/** Adapt extension-owned V3 bundles to the shared SDK used by installed plugins. */
export function getExtensionConsoleV3Embed({ name, baseUrl }: Options) {
  const paths = extensionV3Paths(baseUrl, window.location.origin);
  const actionName = `${name}-actions`;
  const bus = WujieReact.bus;
  const observers = new Set<() => void>();
  let initialized = false;
  let documentPromise: Promise<string> | undefined;
  let ready = false;
  let queued: { params: ActionParams; path: string } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const currentPath = () => window.location.pathname + window.location.search;
  const cancel = (failed = false) => {
    const previous = queued;
    queued = undefined;
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    previous?.params.onCancel?.();
    if (failed) notify.error(t('OPERATION_FAILED'));
  };
  const flush = () => {
    if (!ready || !queued) return;
    if (queued.path !== currentPath()) {
      cancel();
      return;
    }
    const { params } = queued;
    queued = undefined;
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    const { action, ...rest } = params;
    bus.$emit(paths.actionEvent, action, rest);
  };

  const loadDocument = () => {
    if (!documentPromise) {
      documentPromise = Promise.all(
        ['manifest.json', 'manifest.locale.json'].map(async file => {
          const response = await window.fetch(paths.assets + file, { credentials: 'same-origin' });
          if (!response.ok)
            throw new Error(`Extension manifest request failed: ${response.status}`);
          return response.json();
        }),
      )
        .then(([manifest, localeManifest]) =>
          buildExtensionV3Document(paths.assets, manifest, localeManifest, {
            user: globals.user,
            ksConfig: globals.ksConfig,
            runtime: (globals as any).runtime,
            clusterRole: (globals as any).clusterRole,
            theme: (globals as any).theme,
            defaultTheme: (globals as any).defaultTheme,
            useDefaultTheme: (globals as any).useDefaultTheme,
            config: { ...globals.config, webPrefix: paths.webPrefix },
          }),
        )
        .catch(error => {
          documentPromise = undefined;
          throw error;
        });
    }
    return documentPromise;
  };
  const fetchResource: typeof window.fetch = (input, options) => {
    const requested = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (
      requested.origin === window.location.origin &&
      (requested.pathname === new URL(paths.url).pathname ||
        requested.pathname.startsWith(new URL(paths.url).pathname + '/'))
    ) {
      return loadDocument().then(
        html => new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      );
    }
    return window.fetch(input, options);
  };

  function initWujie() {
    if (initialized) return;
    initialized = true;
    WujieReact.setupApp({
      name,
      url: paths.url,
      alive: true,
      fetch: fetchResource,
      props: { name, actions: false },
    });
    WujieReact.setupApp({
      name: actionName,
      url: paths.url,
      alive: true,
      fetch: fetchResource,
      props: { name: actionName, actions: true, hideRouter: true },
    });
  }

  function ExtensionConsoleV3Embed({
    path = '/',
    ...props
  }: {
    path?: string;
    [key: string]: any;
  }) {
    initWujie();
    return (
      <WujieReact
        width="100%"
        height="100%"
        {...props}
        name={name}
        url={paths.url + '/' + path.replace(/^\//, '')}
        alive
        sync={false}
        fetch={fetchResource}
        props={{ name, actions: false }}
      />
    );
  }

  function V3ModalObserver() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      const requestMount = () => setMounted(true);
      const onReady = (loadedName: string) => {
        if (loadedName !== actionName) return;
        ready = true;
        flush();
      };
      observers.add(requestMount);
      bus.$on('loadCompleted', onReady);
      if (queued) requestMount();
      return () => {
        observers.delete(requestMount);
        bus.$off('loadCompleted', onReady);
        if (observers.size === 0) {
          cancel();
          ready = false;
          WujieReact.destroyApp(actionName);
        }
      };
    }, []);
    if (!mounted) return null;
    initWujie();
    return (
      <WujieReact
        width="0"
        height="0"
        name={actionName}
        url={paths.url + '/'}
        alive
        sync={false}
        fetch={fetchResource}
        props={{ name: actionName, actions: true, hideRouter: true }}
        loadError={() => cancel(true)}
      />
    );
  }

  function triggerV3Action(params: ActionParams) {
    if (queued) return;
    initWujie();
    queued = { params, path: currentPath() };
    timeout = setTimeout(() => cancel(true), 20_000);
    for (const observer of observers) observer();
    flush();
  }

  return { initWujie, ExtensionConsoleV3Embed, V3ModalObserver, triggerV3Action };
}
