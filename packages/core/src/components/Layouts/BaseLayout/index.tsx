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
import { toHostResourceLocation } from './consoleV3HostRoute';
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
    const applyHostRoute = (pathOrRoute: string | { pathname?: string; search?: string }) => {
      const loc = toHostResourceLocation(pathOrRoute);
      if (!loc) return;
      const { location } = window;
      if (loc.pathname !== location.pathname) {
        // Replace Wujie's temporary `/resource/name` entry with the native V4
        // detail route. Otherwise browser Back visits the temporary entry
        // first and appears to require two clicks before reaching the list.
        // A list-to-detail transition must push a new entry so the list stays
        // in browser history. The replace case only applies when the host is
        // already on the temporary V3 detail entry (or an equivalent native
        // path) and V3 is subsequently reporting its canonical sub-route.
        const replaceTemporaryEntry = shouldReplaceNativeResourceRoute(
          location.pathname,
          loc.pathname,
        );
        navigate(`${loc.pathname}${loc.search}`, { replace: replaceTemporaryEntry });
      } else if (loc.search !== location.search) {
        const url = new URL(`${location.origin}${loc.pathname}${loc.search}`);
        window.history.pushState('', '', url);
      }
    };
    const onSubRouteChange = (_name: unknown, path: { pathname?: string; search?: string }) =>
      applyHostRoute(path);
    const onConsoleRouteChange = (route: string) => applyHostRoute(route);
    const onEmbedMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'consoleRouteChange' || typeof event.data.route !== 'string') {
        return;
      }
      applyHostRoute(event.data.route);
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
