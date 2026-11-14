import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { KubedConfigProvider, CssBaseline, Notify } from '@kubed/components';
import request, { configureUnauthorizedNavigation } from '../../../shared/src/utils/request';
import ConfigReferencePanel from '../pages/projects/components/ConfigReference/ConfigReferencePanel';
import english from '../../../../locales/en/l10n-projects-components-configReference';
import chinese from '../../../../locales/zh/l10n-projects-components-configReference';
import type { EnhancementHost, EnhancementModule, EnhancementMount } from './enhancementProtocol';

const host = (window.parent as Window & { __deploymentEnhancement?: EnhancementHost })
  .__deploymentEnhancement;
const root = document.getElementById('root')!;
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
let reads: AbortController | undefined;
let requestInterceptor: number | undefined;

function unmount() {
  ReactDOM.unmountComponentAtNode(root);
  reads?.abort();
  if (requestInterceptor !== undefined) request.interceptors.request.eject(requestInterceptor);
  requestInterceptor = undefined;
  queryClient.cancelQueries();
  queryClient.clear();
}

function mount(context: EnhancementMount) {
  unmount();
  Object.assign(window, { globals: context.globals });
  const zh = String(globals.user?.lang || navigator.language).startsWith('zh');
  const translations: Record<string, string> = { ...english, ...(zh ? chinese : {}) };
  const translate = (key: string, params: Record<string, unknown> = {}) =>
    String(translations[key] || key).replace(/\{(\w+)\}/g, (_match, name) =>
      String(params[name] ?? `{${name}}`),
    );
  Object.assign(window, { t: translate });
  const controller = new AbortController();
  reads = controller;
  requestInterceptor = request.interceptors.request.use(config => {
    if (String(config.method || 'GET').toUpperCase() === 'GET' && !config.signal)
      config.signal = controller.signal;
    return config;
  });
  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <KubedConfigProvider themeType="light" locale={zh ? 'zh' : 'en'}>
        <CssBaseline />
        <div style={{ padding: 20 }}>
          <ConfigReferencePanel
            cluster={context.resource.cluster}
            namespace={context.resource.namespace}
            name={context.resource.name}
            module="deployments"
            workloadKind="Deployment"
            onBack={context.onClose}
            onWriteStart={context.onWriteStart}
            onWriteResult={context.onWriteResult}
          />
        </div>
        <Notify position="top-right" />
      </KubedConfigProvider>
    </QueryClientProvider>,
    root,
  );
}

if (host && window.parent !== window) {
  configureUnauthorizedNavigation(() => host.unauthorized());
  document.addEventListener('keydown', event => host.handleFrameKeydown(window, event), true);
  const module: EnhancementModule = { version: 1, mount, unmount };
  host.moduleReady(window, module);
} else {
  const link = document.createElement('a');
  link.href = '/dashboard';
  link.textContent = 'Open the full console';
  root.replaceChildren(link);
}
