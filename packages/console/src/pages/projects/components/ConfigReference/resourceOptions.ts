export type NameOption = { label: string; value: string; disabled?: boolean };

export const toNameOptions = (items: unknown): NameOption[] =>
  (Array.isArray(items)
    ? items
    : Array.isArray((items as { items?: unknown[] } | undefined)?.items)
      ? (items as { items: unknown[] }).items
      : []
  )
    .map(item => {
      if (typeof item === 'string') return item;
      const resource = item as { name?: unknown; metadata?: { name?: unknown } };
      return resource?.name || resource?.metadata?.name;
    })
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .map(name => ({ label: name, value: name }));
