/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  WorkspaceLayout,
  RepoManage,
  AppDeployDetailRoute,
  ProjectLayout,
  WorkspaceListLayout,
  ProjectListLayout,
} from '@ks-console/shared';

import BaseLayout from '../containers/Base/BaseLayout';

import AppDeploy from '../containers/AppDeploy';
import AppDetails from '../containers/AppDetails';
import AppsDashBoard from '../containers/AppsDashBoard';
import AppDeployManage from '../containers/AppDeployManage';
export default [
  // v4.1.3 reserves /apps-manage for cluster management. Keep the old
  // application-repository bookmark as an alias to its supported route.
  {
    path: '/apps-manage/repo',
    element: <Navigate to="/workspaces/system-workspace/app-repos" replace />,
  },
  {
    path: '/apps',
    element: <BaseLayout />,
    children: [
      { index: true, element: <AppsDashBoard /> },
      { path: '/apps/:appName', element: <AppDetails /> },
      { path: '/apps/:appName/deploy', element: <AppDeploy /> },
    ],
  },
  {
    path: '/',
    element: <WorkspaceLayout />,
    children: [
      {
        element: <WorkspaceListLayout />,
        children: [{ path: 'workspaces/:workspace/app-repos', element: <RepoManage /> }],
      },
    ],
  },
  {
    path: '/',
    element: <ProjectLayout />,
    children: [
      {
        element: <ProjectListLayout />,
        children: [
          {
            path: ':workspace/clusters/:cluster/projects/:namespace/deploy',
            exact: true,
            element: <AppDeployManage />,
          },
        ],
      },
      ...AppDeployDetailRoute(':workspace/clusters/:cluster/projects/:namespace/deploy'),
    ],
  },
];
