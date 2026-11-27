import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, useLocation, useRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { CssBaseline, KubedConfigProvider, Notify } from '@kubed/components';
import { sessionRoutes } from '../../../core/src/containers/Session/routes';
import i18n from '../../../core/src/utils/i18n';

function ResumeAuthenticatedPage() {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(location.pathname + location.search + location.hash);
  }, [location]);
  return null;
}

function AuthenticationRoutes() {
  return useRoutes([...sessionRoutes, { path: '*', element: <ResumeAuthenticatedPage /> }]);
}

(async () => {
  (window as any).globals.context = { locales: {} };
  await i18n.init();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <KubedConfigProvider themeType="light" locale="en">
        <CssBaseline />
        <BrowserRouter>
          <AuthenticationRoutes />
        </BrowserRouter>
        <Notify position="top-right" />
      </KubedConfigProvider>
    </QueryClientProvider>,
    document.getElementById('root'),
  );
})();
