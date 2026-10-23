import { useQuery } from 'react-query';
import { configMapStore, request, secretStore } from '@ks-console/shared';

export default function useWorkloadEnvironmentKeys(
  kind: 'configMap' | 'secret' | undefined,
  name: string | undefined,
  context?: { cluster: string; namespace: string },
) {
  const enabled = Boolean(kind && name && context?.cluster && context.namespace);
  return useQuery<string[]>(
    ['workload-environment-keys', context?.cluster, context?.namespace, kind, name],
    async () => {
      if (!kind || !name || !context?.cluster || !context.namespace) return [];
      const store = kind === 'secret' ? secretStore : configMapStore;
      // Kubernetes 没有 key-only 接口。仅选中资源的原始响应经过网络，
      // 绕过 Secret mapper，不解码数据；查询缓存及界面只保留键名。
      const raw: any = await request.get(store.getDetailUrl({ ...context, name }));
      return Object.keys(raw?.data || {});
    },
    { enabled, retry: false },
  );
}
