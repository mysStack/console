type RevisionWorkload = {
  cluster?: string;
  namespace?: string;
  name?: string;
  uid?: string;
  resourceVersion?: string;
};

export const getWorkloadRevisionLookupKey = (
  module: string | undefined,
  detail: RevisionWorkload,
) => {
  const { cluster, namespace, name, uid, resourceVersion } = detail;

  if (!module || !cluster || !namespace || !name || !uid || !resourceVersion) {
    return '';
  }

  return [module, cluster, namespace, name, uid, resourceVersion].join('/');
};
