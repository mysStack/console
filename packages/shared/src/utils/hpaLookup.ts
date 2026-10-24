import { getHpaApiVersion } from './getApiVersion';

type LookupParams = {
  cluster?: string;
  namespace?: string;
  name?: string;
};

type WorkloadIdentity = {
  uid?: string;
  resourceVersion?: string;
};

type LoadHpaOptions = {
  params: LookupParams;
  detail: WorkloadIdentity & Record<string, any>;
  k8sVersion?: string;
  checkName: (
    detail: Record<string, any>,
    options: Record<string, any>,
    url: string,
  ) => Promise<{ exist: boolean }>;
  fetchDetail: (detail: Record<string, any>, url: string) => Promise<Record<string, any>>;
};

export const getHpaLookupKey = (params: LookupParams, detail: WorkloadIdentity) => {
  const { cluster, namespace, name } = params;
  const { uid, resourceVersion } = detail;

  if (!cluster || !namespace || !name || !uid || !resourceVersion) {
    return '';
  }

  return [cluster, namespace, name, uid, resourceVersion].join('/');
};

export const loadHpaDetail = async ({
  params,
  detail,
  k8sVersion,
  checkName,
  fetchDetail,
}: LoadHpaOptions) => {
  const version = getHpaApiVersion(k8sVersion);
  const url =
    `/clusters/${params.cluster}/apis/${version}/namespaces/${params.namespace}` +
    `/horizontalpodautoscalers/${params.name}`;
  const response = await checkName(detail, {}, url);

  if (!response.exist) {
    return null;
  }

  return fetchDetail({ ...detail, ...params }, url);
};
