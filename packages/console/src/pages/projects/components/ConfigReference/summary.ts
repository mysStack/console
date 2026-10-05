import { parseEnvFrom } from './envFrom';
import type { EnvFromReference } from './types';

export interface ConfigReferenceSummaryRow extends EnvFromReference {
  label: '来自配置字典' | '来自保密字典';
}

export function getConfigReferenceSummaryPrefix(reference: EnvFromReference): string | undefined {
  return reference.prefix || undefined;
}

export function getConfigReferenceSummaryRows(container: unknown): ConfigReferenceSummaryRow[] {
  return parseEnvFrom((container as { envFrom?: unknown } | undefined)?.envFrom).map(reference => ({
    ...reference,
    label: reference.kind === 'configMap' ? '来自配置字典' : '来自保密字典',
  }));
}
