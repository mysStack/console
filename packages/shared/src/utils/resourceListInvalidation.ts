export class ResourceListInvalidation {
  private revisions = new Map<string, number>();
  private generation = 0;

  invalidate(resource: string): number {
    const next = (this.revisions.get(resource) || 0) + 1;
    this.revisions.set(resource, next);
    return next;
  }

  get(resource: string): number {
    return this.revisions.get(resource) || 0;
  }

  clear(): void {
    this.revisions.clear();
    this.generation += 1;
  }

  getVersion(resource: string): string {
    return `${this.generation}:${this.get(resource)}`;
  }
}

export const resourceListInvalidation = new ResourceListInvalidation();

export const invalidateResourceList = (resource?: string): number => {
  if (!resource) return 0;
  return resourceListInvalidation.invalidate(resource);
};

export const getResourceListRevision = (resource: string): number =>
  resourceListInvalidation.get(resource);

export const getResourceListCacheVersion = (resource: string): string =>
  resourceListInvalidation.getVersion(resource);

export const clearResourceListRevisions = (): void => resourceListInvalidation.clear();
