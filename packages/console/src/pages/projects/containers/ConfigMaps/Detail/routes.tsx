/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

import ConfigMapData from './Data';
import ConfigMapEvents from './Events';
import ConfigMapMetadata from './Metadata';
import ConfigMapRevisionControl from './RevisionControl';

export default [
  {
    index: true,
    element: <Navigate to="detail" replace />,
  },
  {
    path: 'detail',
    element: <ConfigMapData />,
  },
  {
    path: 'revision-control',
    element: <ConfigMapRevisionControl />,
  },
  {
    path: 'metadata',
    element: <ConfigMapMetadata />,
  },
  {
    path: 'events',
    element: <ConfigMapEvents />,
  },
];
