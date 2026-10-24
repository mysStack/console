/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { useEffect, useState } from 'react';
import { workloadStore } from '@ks-console/shared';
import type { WorkloadKind } from './deployment';

const stores = {
  Deployment: workloadStore('deployments'),
  StatefulSet: workloadStore('statefulsets'),
};

export default function useWorkloadTargetOptions(
  kind: WorkloadKind,
  cluster: string,
  namespace: string,
) {
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(kind !== 'DaemonSet');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    if (kind === 'DaemonSet' || !namespace) {
      setOptions([]);
      setIsLoading(false);
      setIsError(false);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);
    setIsError(false);
    const store = kind === 'Deployment' ? stores.Deployment : stores.StatefulSet;
    store
      .fetchListByK8s({ cluster, namespace })
      .then((items: Record<string, any>[]) => {
        if (!active) return;
        setOptions([...new Set(items.map(item => item.name).filter(Boolean))]);
      })
      .catch(() => active && setIsError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [cluster, kind, namespace]);

  return { options, isLoading, isError };
}
