export const SECRET_METADATA_ACCEPT =
  'application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1';
export const CONFIGMAP_METADATA_ACCEPT = SECRET_METADATA_ACCEPT;
export const toMetadataNameList = (items: Array<{ metadata?: { name?: string } }> = []): string[] =>
  items.map(item => item.metadata?.name).filter((name): name is string => Boolean(name));
export const toSecretNameList = (items: Array<{ metadata?: { name?: string } }> = []): string[] =>
  toMetadataNameList(items);
