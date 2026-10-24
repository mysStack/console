type RevisionWorkload = {
  cluster?: string;
  namespace?: string;
  name?: string;
  uid?: string;
  resourceVersion?: string;
};

export const getWorkloadIdentityKey = (
  module: string | undefined,
  detail: RevisionWorkload = {},
) => {
  const { cluster, namespace, name, uid, resourceVersion } = detail;

  if (!module || !cluster || !namespace || !name || !uid || !resourceVersion) {
    return '';
  }

  return [module, cluster, namespace, name, uid, resourceVersion].join('/');
};

export const getWorkloadRevisionLookupKey = getWorkloadIdentityKey;
