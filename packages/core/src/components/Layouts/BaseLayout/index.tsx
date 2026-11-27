/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import WujieReact from 'wujie-react';
import { createGlobalStyle } from 'styled-components';

import type { GlobalMessage } from '@ks-console/shared';
import {
  PageConstants,
  StylesConstants,
  useGlobalStyles,
  useEventEmitter,
  requestHelper,
} from '@ks-console/shared';

import Toolbox from '../../../containers/Toolbox';
import Header from '../Header';
import { Main } from './styles';
import v3Notify from './v3Notify';
import { shouldFollowConsoleV3Route, toHostResourceLocation } from './consoleV3HostRoute';
import { shouldReplaceNativeResourceRoute } from './nativeResourceRoute';

const GlobalStyle = createGlobalStyle<{ $navbarHeight?: number; $licenseTipHeight?: number }>`
  :root {
    --page-header-navbar-height: ${({ $navbarHeight }) => $navbarHeight}px;
    --page-header-license-tip-height: ${({ $licenseTipHeight }) => $licenseTipHeight}px;
    --page-header-height: calc(var(--page-header-navbar-height) + var(--page-header-license-tip-height));
  }
`;

const { bus } = WujieReact;

const eventer = () => {
  bus.$emit('documentClick', {});
};

export default function BaseLayout() {
  const navigate = useNavigate();
  const { cluster } = useParams();

  const headerHight = StylesConstants.DEFAULT_PAGE_HEADER_HEIGHT;

  const { updateGlobalStyles } = useGlobalStyles();

  const { $on, $off } = useEventEmitter();

  useEffect(() => {
    updateGlobalStyles({ pageHeaderHeight: headerHight });
  }, [headerHight]);

  useEffect(() => {
    const key = 'globalMsg';

    $on(key, (msg: GlobalMessage) => {
      const { response } = msg;
      const isApiForbiddenError = requestHelper.getIsApiForbiddenError({
        method: response?.config.method ?? '',
        code: response?.data?.code,
        reason: response?.data?.reason,
      });

      if (isApiForbiddenError) {
        navigate(PageConstants.PAGE_PATHS.errors.forbidden, { replace: true });
      }
    });

    return () => {
      $off(key);
    };
  }, [$off, $on, navigate]);

  useEffect(() => {
    const key = 'consoleV3.apiForbiddenError';

    bus.$on(key, () => {
      navigate(PageConstants.PAGE_PATHS.errors.forbidden, { replace: true });
    });
    bus.$on('notify', v3Notify);

    return () => {
      bus.$off(key, () => {});
      bus.$off('notify', v3Notify);
    };
  }, [navigate]);

  globals.currentCluster = cluster;

  useEffect(() => {
    const applyHostRoute = (
      pathOrRoute: string | { pathname?: string; search?: string; hash?: string },
      action?: string,
      previousRoute?: string,
    ) => {
      const loc = toHostResourceLocation(pathOrRoute);
      if (!loc) return;
      const { location } = window;
      if (!shouldFollowConsoleV3Route(location.pathname, loc.pathname, action, previousRoute)) {
        return;
      }
      if (
        loc.pathname !== location.pathname ||
        loc.search !== location.search ||
        loc.hash !== location.hash
      ) {
        // Replace Wujie's temporary `/resource/name` entry with the native V4
        // detail route. Otherwise browser Back visits the temporary entry
        // first and appears to require two clicks before reaching the list.
        // A list-to-detail transition must push a new entry so the list stays
        // in browser history. The replace case only applies when the host is
        // already on the temporary V3 detail entry (or an equivalent native
        // path) and V3 is subsequently reporting its canonical sub-route.
        const replaceTemporaryEntry =
          loc.pathname !== location.pathname &&
          shouldReplaceNativeResourceRoute(location.pathname, loc.pathname);
        navigate(`${loc.pathname}${loc.search}${loc.hash}`, {
          replace: replaceTemporaryEntry || action === 'REPLACE' || action === 'POP',
        });
      }
    };
    const onSubRouteChange = (
      name: unknown,
      path: { pathname?: string; search?: string; hash?: string },
    ) => {
      if (name === 'consoleV3Actions') return;
      applyHostRoute(path);
    };
    const onConsoleRouteChange = (route: string, action?: string, previousRoute?: string) => {
      // A parked sandbox or an actions overlay must not navigate the host.
      if (
        !document.querySelector(
          'wujie-app[data-wujie-id="consolev3"],iframe[data-wujie-id="consolev3"]',
        )
      )
        return;
      applyHostRoute(route, action, previousRoute);
    };
    const onEmbedMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'consoleRouteChange' || typeof event.data.route !== 'string') {
        return;
      }
      const child = document.querySelector<HTMLIFrameElement>('iframe[name="consolev3"]');
      if (event.source !== child?.contentWindow) return;
      onConsoleRouteChange(
        event.data.route,
        typeof event.data.action === 'string' ? event.data.action : undefined,
        typeof event.data.previousRoute === 'string' ? event.data.previousRoute : undefined,
      );
    };

    document.addEventListener('click', eventer);
    window.addEventListener('message', onEmbedMessage);
    bus.$on('subRouteChange', onSubRouteChange);
    bus.$on('consoleRouteChange', onConsoleRouteChange);
    bus.$on('notify', v3Notify);
    return () => {
      bus.$off('subRouteChange', onSubRouteChange);
      bus.$off('consoleRouteChange', onConsoleRouteChange);
      bus.$off('notify', v3Notify);
      window.removeEventListener('message', onEmbedMessage);
      document.removeEventListener('click', eventer);
    };
  }, []);

  return (
    <>
      <GlobalStyle
        $licenseTipHeight={0}
        $navbarHeight={StylesConstants.PAGE_HEADER_NAVBAR_HEIGHT}
      />
      <Header />
      <Main $headerHight={headerHight}>
        <Outlet />
      </Main>
      <Toolbox />
    </>
  );
}
