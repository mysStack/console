export const preserveResourceVersion = <T extends Record<string, any>>(
  data: T,
  initialValues?: Record<string, any>,
): T => {
  const resourceVersion =
    data.metadata?.resourceVersion ||
    initialValues?._originData?.metadata?.resourceVersion ||
    initialValues?.metadata?.resourceVersion;

  if (!resourceVersion) {
    return data;
  }

  return {
    ...data,
    metadata: {
      ...data.metadata,
      resourceVersion,
    },
  };
};
