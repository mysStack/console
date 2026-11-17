/** Convert decimal and binary Kubernetes resource quantities to their base unit. */
export function unitToNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const match = String(value)
    .trim()
    .match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([numkKMGTPE]|[KMGTPE]i)?$/);
  if (!match) return Number.NaN;
  const suffix = match[2] || '';
  const units: Record<string, number> = {
    n: 1e-9,
    u: 1e-6,
    m: 1e-3,
    k: 1e3,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
    E: 1e18,
  };
  const factor = suffix.endsWith('i')
    ? 1024 ** ('KMGTPE'.indexOf(suffix[0]) + 1)
    : units[suffix] || 1;
  return Number(match[1]) * factor;
}
