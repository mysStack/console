import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { WorkloadKind } from '../../components/WorkloadForm/types';
import { getWorkloadCreateUrl, getWorkloadEditUrl } from './routeConfig';

type RouteParams = {
  workspace: string;
  cluster: string;
  namespace: string;
};

type NativeWorkloadNavigation = {
  mode: 'create' | 'edit';
  kind: WorkloadKind;
  name?: string;
};

export function useNativeWorkloadBridge() {
  const navigate = useNavigate();
  const params = useParams<RouteParams>();

  const navigateToNativeWorkload = useCallback(
    ({ mode, kind, name }: NativeWorkloadNavigation) => {
      const { workspace, cluster, namespace } = params;
      if (!workspace || !cluster || !namespace) {
        return;
      }

      const workloadParams = { workspace, cluster, namespace };
      if (mode === 'edit') {
        if (!name) {
          return;
        }
        navigate(getWorkloadEditUrl(kind, workloadParams, name));
        return;
      }

      navigate(getWorkloadCreateUrl(kind, workloadParams));
    },
    [navigate, params],
  );

  return {
    nativeWorkloadForm: true,
    navigateToNativeWorkload,
  };
}
