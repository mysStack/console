/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import WujieReact from 'wujie-react';
import { isMultiCluster } from '@ks-console/shared';
import { useNavigate } from 'react-router-dom';

import { getClusterHostRoute } from './routeSync';

const { bus } = WujieReact;

export default function Embed() {
  const navigate = useNavigate();

  useEffect(() => {
    const syncHostRoute = (route: string) => {
      const hostRoute = getClusterHostRoute(route);
      if (hostRoute && window.location.pathname !== hostRoute) {
        navigate(hostRoute, { replace: false });
      }
    };
    const handleMessage = (event: MessageEvent<{ type?: string; route?: string }>) => {
      if (event.origin === window.location.origin && event.data?.type === 'consoleRouteChange') {
        syncHostRoute(event.data.route || '');
      }
    };

    bus.$on('consoleRouteChange', syncHostRoute);
    window.addEventListener('message', handleMessage);
    return () => {
      bus.$off('consoleRouteChange', syncHostRoute);
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  useEffect(() => {
    if (!isMultiCluster()) {
      navigate('/clusters/default/overview');
    }
  }, []);

  if (!isMultiCluster()) {
    return null;
  }

  const url = `//${window.location.host}/consolev3/clusters`;
  return <WujieReact width="100%" height="100%" name="consolev3" url={url} sync={false} />;
}
