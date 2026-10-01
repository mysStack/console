import React from 'react';

import WorkloadCreate from './Create';
import WorkloadEdit from './Edit';
import { WORKLOAD_KINDS } from './routeConfig';

export const createWorkloadRoutes = WORKLOAD_KINDS.map(kind => ({
  path: `${kind}/new`,
  element: <WorkloadCreate kind={kind} />,
}));

export const editWorkloadRoutes = (PATH: string) =>
  WORKLOAD_KINDS.map(kind => ({
    path: `${PATH}/${kind}/:name/edit`,
    element: <WorkloadEdit kind={kind} />,
  }));

export default createWorkloadRoutes;
