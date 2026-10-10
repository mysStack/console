export type MetadataResource = {
  metadata?: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
};

/** Keep the metadata view aligned with the shared detail-page widgets. */
export const metadataDetail = (resource?: MetadataResource): Record<string, any> =>
  resource?.metadata || {};
