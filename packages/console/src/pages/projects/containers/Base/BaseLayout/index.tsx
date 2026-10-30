/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useRef } from 'react';
import { set } from 'lodash';
import { useCacheStore as useStore } from '@ks-console/shared';
import { Loading } from '@kubed/components';
import { useQueries, useQuery } from 'react-query';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  apis,
  assignConsoleV3UrlPrefixIfChanged,
  ClusterDetail,
  clusterStore,
  getConsoleV3UrlPrefix,
  projectStore,
} from '@ks-console/shared';

const { fetchDetail: fetchProjectDetail } = projectStore;
const { fetchDetail: fetchClusterDetail } = clusterStore;

function BaseLayout(): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userName = globals.user.username;
  const { cluster, namespace, workspace } = useParams<'workspace' | 'namespace' | 'cluster'>();
  const [wujieUrlPrefix, setUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const setUrlPrefixStable = useRef(setUrlPrefix).current;
  const wujieUrlPrefixRef = useRef(wujieUrlPrefix);
  wujieUrlPrefixRef.current = wujieUrlPrefix;
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
      queryKey: ['workspaceRule', userName, workspace],
      queryFn: () => apis.fetchRules({ workspace, name: userName }),
      enabled: !!workspace,
    },
  ]);
  const holeRules = useQuery(
    ['holeRules', userName, cluster, workspace, namespace],
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
    const basePrefix = `/${workspace}/clusters/${cluster}/projects/${namespace}`;
    // Detail routes mount outside ProjectListLayout, so this layout is the only
    // writer of the prefix for them. It must emit the same absolute value, or a
    // layout remount writes the bare path and every V3 embed stays unmounted.
    // Skip identical writes: BaseLayout and ListLayout both publish this store.
    assignConsoleV3UrlPrefixIfChanged(
      wujieUrlPrefixRef.current,
      getConsoleV3UrlPrefix(basePrefix),
      setUrlPrefixStable,
    );
  }, [cluster, namespace, setUrlPrefixStable, workspace]);

  // Project-domain warmup: prime CRD/list-seed for deployments; off overview,
  // also preloadApp that list URL (installed by initWujie on window).
  useEffect(() => {
    if (!workspace || !cluster || !namespace) return;
    const scheduler = (window as unknown as Record<string, unknown>)[
      '__KS_SCHEDULE_CONSOLE_V3_PROJECT_WARMUP__'
    ];
    if (typeof scheduler === 'function') {
      (scheduler as (path: string) => void)(pathname);
    }
  }, [cluster, namespace, pathname, workspace]);

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
