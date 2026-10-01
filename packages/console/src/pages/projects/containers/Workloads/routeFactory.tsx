import React from 'react';
import { WORKLOAD_KINDS } from './routeConfig';
import type { WorkloadKind } from '../../components/WorkloadForm/types';

type WorkloadPage = (props: { kind: WorkloadKind; mode?: 'create' | 'edit' }) => React.ReactElement;

export function createNativeWorkloadRoutes(
  CreatePage: WorkloadPage,
  EditPage: WorkloadPage,
  prefix = '',
) {
  const base = prefix ? `${prefix}/` : '';
  return WORKLOAD_KINDS.flatMap(kind => [
    { path: `${base}${kind}/new`, element: <CreatePage kind={kind} mode="create" /> },
    { path: `${base}${kind}/:name/edit`, element: <EditPage kind={kind} mode="edit" /> },
  ]);
}
