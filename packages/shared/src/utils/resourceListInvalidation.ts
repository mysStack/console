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

/**
 * Canonical form of a rule map, insensitive to the order in which the server
 * returned role templates.
 */
const serializeRules = (rules: Record<string, unknown>): string =>
  JSON.stringify(
    Object.keys(rules)
      .sort()
      .map(key => {
        const value = rules[key];
        return [
          key,
          Array.isArray(value)
            ? value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).sort()
            : String(value),
        ];
      }),
  );

/**
 * Remembers the rules fetched for a scope.
 *
 * `fetchRules` runs on every layout entry, so invalidating cached resource
 * lists on every call would rebuild them on every cross-layout return even
 * when the rules never changed. Only a real rule change must invalidate.
 */
export class RuleSnapshots {
  private snapshots = new Map<string, string>();

  /** Whether the scope's rules differ from the previously recorded ones. */
  record(scope: string, rules: Record<string, unknown>): boolean {
    const next = serializeRules(rules);
    const changed = this.snapshots.has(scope) && this.snapshots.get(scope) !== next;
    this.snapshots.set(scope, next);
    return changed;
  }

  clear(): void {
    this.snapshots.clear();
  }
}

export const ruleSnapshots = new RuleSnapshots();
