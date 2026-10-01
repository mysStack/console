export const SECRET_METADATA_ACCEPT =
  'application/json;as=PartialObjectMetadata;g=meta.k8s.io;v=v1';
export const toSecretNameList = (items: Array<{ metadata?: { name?: string } }> = []): string[] =>
  items.map(item => item.metadata?.name).filter((name): name is string => Boolean(name));
