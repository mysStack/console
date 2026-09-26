export type RepoCredentialItem = { metadata: { name: string } };

export type RepoCredentialResponse = {
  items?: RepoCredentialItem[];
  data?: { items?: RepoCredentialItem[] };
};

export function normalizeRepoCredentialWorkspace(workspace?: string): string {
  return workspace || 'system-workspace';
}

export function getRepoCredentialItems(response: unknown): RepoCredentialItem[] {
  if (Array.isArray(response)) {
    return response as RepoCredentialItem[];
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const payload = response as RepoCredentialResponse;
  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  const wrappedItems = payload.data?.items;
  return Array.isArray(wrappedItems) ? wrappedItems : [];
}

export function getRepoCredentialMetadata(response: unknown): RepoCredentialItem | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const payload = response as {
    metadata?: { name?: string };
    data?: { metadata?: { name?: string } };
  };
  const metadata = payload.metadata || payload.data?.metadata;
  return metadata?.name ? { metadata: { name: metadata.name } } : undefined;
}
