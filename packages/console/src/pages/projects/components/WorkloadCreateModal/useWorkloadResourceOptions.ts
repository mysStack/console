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
          context: { cluster, namespace },
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

  // 路由作用域变化后的首帧也不能暴露上一个项目的资源名称。
  const currentOptions =
    options.context?.cluster === cluster && options.context.namespace === namespace
      ? options
      : EMPTY_OPTIONS;
  return { options: currentOptions, isLoading, isError };
}
