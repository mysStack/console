import type { EnvFromReference } from './types';

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizePrefix = (value: unknown) => (typeof value === 'string' ? value : '');

export function parseEnvFrom(source: unknown): EnvFromReference[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.reduce<EnvFromReference[]>((references, item) => {
    if (!isRecord(item)) {
      return references;
    }

    const configMapRef = isRecord(item.configMapRef) ? item.configMapRef : undefined;
    const secretRef = isRecord(item.secretRef) ? item.secretRef : undefined;
    const hasConfigMap = typeof configMapRef?.name === 'string' && configMapRef.name.trim() !== '';
    const hasSecret = typeof secretRef?.name === 'string' && secretRef.name.trim() !== '';

    // Kubernetes EnvFromSource is a union. Ignore malformed or ambiguous entries.
    if (hasConfigMap === hasSecret) {
      return references;
    }

    const reference = hasConfigMap
      ? { kind: 'configMap' as const, name: configMapRef!.name.trim() }
      : { kind: 'secret' as const, name: secretRef!.name.trim() };
    const prefix = normalizePrefix(item.prefix);

    references.push(prefix ? { ...reference, prefix } : reference);
    return references;
  }, []);
}

export function serializeEnvFrom(rows: EnvFromReference[]): unknown[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.reduce<unknown[]>((result, row) => {
    if (!row || (row.kind !== 'configMap' && row.kind !== 'secret')) {
      return result;
    }

    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) {
      return result;
    }

    const reference =
      row.kind === 'configMap' ? { configMapRef: { name } } : { secretRef: { name } };
    const prefix = typeof row.prefix === 'string' ? row.prefix : '';
    result.push(prefix ? { ...reference, prefix } : reference);
    return result;
  }, []);
}

export function findDuplicateReferences(rows: EnvFromReference[]): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];

  rows.forEach((row, index) => {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    if (!name) {
      return;
    }

    // A resource referenced more than once can produce colliding environment
    // names even when the prefixes differ; keep one reference per kind/name.
    // The prefix is part of the identity: importing the same resource twice
    // under different prefixes is legal and is exactly how collisions are
    // avoided, so only an identical (kind, name, prefix) triple is a duplicate.
    const key = `${row.kind}:${name}:${typeof row.prefix === 'string' ? row.prefix : ''}`;
    if (seen.has(key)) {
      duplicates.push(index);
    } else {
      seen.add(key);
    }
  });

  return duplicates;
}
