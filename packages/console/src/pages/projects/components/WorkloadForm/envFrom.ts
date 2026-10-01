import { DuplicateEnvFrom, EnvFromReference, EnvFromSource } from './types';

export function parseEnvFrom(items: EnvFromSource[] = []): EnvFromReference[] {
  return items.reduce<EnvFromReference[]>((rows, item) => {
    const type = item.configMapRef ? 'configMap' : item.secretRef ? 'secret' : undefined;
    const name = item.configMapRef?.name ?? item.secretRef?.name;

    if (type && name) {
      rows.push({ type, name, prefix: item.prefix ?? '' });
    }

    return rows;
  }, []);
}

export function removeIncompleteEnvFrom(rows: EnvFromReference[]): EnvFromReference[] {
  return rows.filter(row => Boolean(row && row.type && row.name));
}

export function serializeEnvFrom(rows: EnvFromReference[]): EnvFromSource[] {
  return removeIncompleteEnvFrom(rows).map(({ type, name, prefix }) => ({
    ...(type === 'configMap' ? { configMapRef: { name } } : { secretRef: { name } }),
    ...(prefix ? { prefix } : {}),
  }));
}

export function findDuplicateEnvFrom(rows: EnvFromReference[]): DuplicateEnvFrom[] {
  const seen = new Set<string>();

  return rows.reduce<DuplicateEnvFrom[]>((duplicates, row, index) => {
    const key = `${row.type}:${row.name}`;

    if (seen.has(key)) {
      duplicates.push({ index, name: row.name, type: row.type });
    } else {
      seen.add(key);
    }

    return duplicates;
  }, []);
}
