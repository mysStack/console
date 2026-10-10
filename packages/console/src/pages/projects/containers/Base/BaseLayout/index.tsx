/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import { set } from 'lodash';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { Loading } from '@kubed/components';
import { useQueries, useQuery } from 'react-query';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { apis, ClusterDetail, clusterStore, projectStore } from '@ks-console/shared';
import { getConsoleV3ProjectPrefix, getHostRouteFromEmbeddedRoute } from './route';

const { fetchDetail: fetchProjectDetail } = projectStore;
const { fetchDetail: fetchClusterDetail } = clusterStore;
const { bus } = WujieReact;

function BaseLayout(): JSX.Element {
  const navigate = useNavigate();
  const userName = globals.user.username;
  const { cluster, namespace, workspace } = useParams<'workspace' | 'namespace' | 'cluster'>();
  const [, setUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const [, setProject] = useStore<any>('project');
  const [, setCluster] = useStore<ClusterDetail>('cluster');
  const [projectResult, clusterResult, workspaceRuleResult] = useQueries([
    {
      queryKey: ['project', 'detail', cluster, namespace, workspace],
      queryFn: () => fetchProjectDetail({ cluster, workspace, name: namespace }),
      onSuccess: setProject,
      enabled: !!cluster && !!namespace && !!workspace,
    },
    {
      queryKey: ['cluster', 'detail', cluster],
      queryFn: () => fetchClusterDetail({ name: cluster }),
      onSuccess: setCluster,
      enabled: !!cluster,
    },
    {
      queryKey: ['workspaceRule', workspace],
      queryFn: () => apis.fetchRules({ workspace, name: userName }),
      enabled: !!workspace,
    },
  ]);
  const holeRules = useQuery(
    ['holeRules'],
    () => apis.fetchRules({ cluster, workspace, namespace, name: userName }),
    {
      enabled: projectResult.isSuccess && clusterResult.isSuccess && workspaceRuleResult.isSuccess,
      onSuccess: () => {
        set(globals, `clusterConfig.${cluster}`, clusterResult.data?.configz);
        // TODO: cache history
        // globals.app.cacheHistory(this.props.match.url, {
        //   type: 'Project',
        //   ...pick(this.store.detail, ['name', 'aliasName']),
        //   cluster: pick(this.clusterStore.detail, ['name', 'aliasName', 'group', 'provider']),
        // });
      },
    },
  );

  useEffect(() => {
    const basePrefix = getConsoleV3ProjectPrefix({
      host: window.location.host,
      workspace,
      cluster,
      namespace,
    });
    setUrlPrefix(basePrefix);
  }, [cluster, namespace, setUrlPrefix, workspace]);

  useEffect(() => {
    const projectPath = `/${workspace}/clusters/${cluster}/projects/${namespace}`;
    let syncTimer: number | undefined;
    const handleRouteChange = (route: string) => {
      const hostRoute = getHostRouteFromEmbeddedRoute(route, projectPath);
      if (!hostRoute || window.location.pathname === hostRoute) {
        return;
      }

      if (syncTimer) {
        window.clearTimeout(syncTimer);
      }
      syncTimer = window.setTimeout(() => {
        if (window.location.pathname !== hostRoute) {
          window.history.pushState({}, '', hostRoute);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        syncTimer = undefined;
      }, 0);
    };
    const handleMessage = (event: MessageEvent<{ type?: string; route?: string }>) => {
      if (event.origin === window.location.origin && event.data?.type === 'consoleRouteChange') {
        handleRouteChange(event.data.route || '');
      }
    };

    bus.$on('consoleRouteChange', handleRouteChange);
    window.addEventListener('message', handleMessage);
    return () => {
      if (syncTimer) {
        window.clearTimeout(syncTimer);
      }
      bus.$off('consoleRouteChange', handleRouteChange);
      window.removeEventListener('message', handleMessage);
    };
  }, [cluster, namespace, workspace]);

  if (
    projectResult.isLoading ||
    clusterResult.isLoading ||
    workspaceRuleResult.isLoading ||
    holeRules.isLoading
  ) {
    return <Loading className="page-loading" />;
  }

  if (!projectResult.data?.name) {
    navigate('/404');
    return <></>;
  }

  return <Outlet />;
}

export default BaseLayout;
