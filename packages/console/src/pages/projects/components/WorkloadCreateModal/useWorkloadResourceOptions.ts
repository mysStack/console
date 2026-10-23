import { useEffect, useState } from 'react';
import { configMapStore, pvcStore, secretStore } from '@ks-console/shared';
import type { WorkloadResourceOptions } from './ContainerInput';

const EMPTY_OPTIONS: WorkloadResourceOptions = {
  configMaps: [],
  secrets: [],
  imagePullSecrets: [],
  persistentVolumeClaims: [],
};

export default function useWorkloadResourceOptions(cluster: string, namespace: string) {
  const [options, setOptions] = useState<WorkloadResourceOptions>(EMPTY_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!namespace) {
      setOptions(EMPTY_OPTIONS);
      setIsLoading(false);
      setIsError(false);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);
    setIsError(false);
    Promise.all([
      configMapStore.fetchNameListByK8s({ cluster, namespace }),
      secretStore.fetchNameListByK8s({ cluster, namespace }),
      secretStore.fetchNameListByK8s({
        cluster,
        namespace,
        fieldSelector: 'type=kubernetes.io/dockerconfigjson',
      }),
      pvcStore.fetchListByK8s({ cluster, namespace }),
    ])
      .then(([configMaps, secrets, imagePullSecrets, claims]) => {
        if (!active) return;
        setOptions({
          configMaps,
          secrets,
          imagePullSecrets,
          persistentVolumeClaims: (claims || [])
            .map((claim: Record<string, any>) => claim.name)
            .filter(Boolean),
        });
      })
      .catch(() => active && setIsError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [cluster, namespace]);

  return { options, isLoading, isError };
}
