import { parseEnvFrom } from './envFrom';
import type { EnvFromReference } from './types';

export interface ConfigReferenceSummaryRow extends EnvFromReference {
  label: 'ConfigMap' | 'Secret';
}

export function getConfigReferenceSummaryRows(container: unknown): ConfigReferenceSummaryRow[] {
  return parseEnvFrom((container as { envFrom?: unknown } | undefined)?.envFrom).map(reference => ({
    ...reference,
    label: reference.kind === 'configMap' ? 'ConfigMap' : 'Secret',
  }));
}
