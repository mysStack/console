export const MASKED_SECRET_VALUE = '******';

export function getSecretDisplayValue(value: unknown, showSecret: boolean): string {
  if (!showSecret) {
    return MASKED_SECRET_VALUE;
  }

  return value == null ? '' : String(value);
}
