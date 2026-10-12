/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

import SecretData from './Data';
import SecretEvents from './Events';
import SecretMetadata from './Metadata';
import SecretRevisionControl from './RevisionControl';

export default [
  {
    index: true,
    element: <Navigate to="detail" replace />,
  },
  {
    path: 'detail',
    element: <SecretData />,
  },
  {
    path: 'revision-control',
    element: <SecretRevisionControl />,
  },
  {
    path: 'metadata',
    element: <SecretMetadata />,
  },
  {
    path: 'events',
    element: <SecretEvents />,
  },
];
