/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

import Events from './Events';
import Overview from './Overview';

import RepoDetail from './index';

const PATH = '/workspaces/:workspace/repos/:repoId';

export default [
  {
    path: PATH,
    element: <RepoDetail />,
    children: [
      {
        index: true,
        element: <Navigate to="overview" replace />,
      },
      {
        path: 'overview',
        element: <Overview />,
      },
      {
        path: 'events',
        element: <Events />,
      },
    ],
  },
];
