/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { Loading } from '@kubed/components';
import { useCacheStore } from '@ks-console/shared';
import { default as React, useEffect } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useRoutes } from 'react-router-dom';
import { create } from 'zustand';

import BaseLayout from './components/Layouts/BaseLayout';
import { sessionRoutes } from './containers/Session/routes';
import { errorRoutes } from './containers/Errors/routes';
import { NotFound } from './containers/Errors/404';
import extensionsRoutes from './containers/Extensions/routes';
import marketplaceRoutes from './containers/Marketplace/routes';
import { routes as supportRoutes } from './containers/Support';
import { registerRemoteExtensions } from './utils/extensions.remote';

const baseRoutes: RouteObject[] = [...sessionRoutes];

const homePage = globals.config.homePage || '/dashboard';

const useRouterStore = create<{
  data: { hasInit: Boolean; routes: RouteObject[] };
  setRoutes: (routes: RouteObject[]) => void;
}>(set => ({
  data: {
    hasInit: false,
    routes: baseRoutes,
  },
  setRoutes: routes => {
    set({ data: { hasInit: true, routes } });
  },
}));

function Pages() {
  const setRoutes = useRouterStore(state => state.setRoutes);
  const [, setNavigationRevision] = useCacheStore<number>('ExtensionNavigationRevision', 0);
  useEffect(() => {
    const publishRoutes = (extensionsReady: boolean) => {
      const pages = {
        path: '/',
        element: <BaseLayout />,
        children: [
          ...globals.context.routes.map(route => {
            // An installed extension may replace an internal legacy fallback.
            // Do not mount that fallback before its routes have registered.
            const pending =
              !extensionsReady &&
              globals.installedExtensions?.some(
                extension => route.path === `/${extension.extensionName}`,
              );
            return pending
              ? { ...route, element: <Loading className="page-loading" />, children: [] }
              : route;
          }),
          ...extensionsRoutes,
          ...marketplaceRoutes,
          ...supportRoutes,
          ...errorRoutes,
          {
            index: true,
            element: <Navigate to={homePage} replace />,
          },
          {
            path: '*',
            element: extensionsReady ? <NotFound /> : <Loading className="page-loading" />,
          },
        ],
      };

      const routes = [pages, ...baseRoutes];
      setRoutes(routes);
    };
    publishRoutes(false);
    Promise.resolve(registerRemoteExtensions()).then(() => {
      setNavigationRevision(value => (value ?? 0) + 1);
      publishRoutes(true);
    });
  }, [setRoutes]);

  return <Loading className="page-loading" />;
}

export default function () {
  const data = useRouterStore(state => state.data);
  const router = React.useMemo(() => {
    if (!data.hasInit) {
      return [
        ...data.routes,
        {
          path: '*',
          Component: Pages,
        },
      ];
    } else {
      return data.routes;
    }
  }, [data]);
  return useRoutes(router);
}
