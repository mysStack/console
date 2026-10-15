import { parseEnvFrom } from './envFrom';
import type { EnvFromReference } from './types';
import { getPodTemplateContainers } from './workload';

/** `env` includes literal and valueFrom entries, but never the keys from envFrom. */
export function getContainerEnvironmentVariableCount(source: unknown, name: string): number {
  const container = getPodTemplateContainers(source as any).find(item => item?.name === name);
  const env = container?.env;
  return Array.isArray(env) ? env.length : 0;
}

export interface ConfigReferenceSummaryRow extends EnvFromReference {
  label: 'FROM_CONFIGMAP' | 'FROM_SECRET';
}

export function getConfigReferenceSummaryPrefix(reference: EnvFromReference): string | undefined {
  return reference.prefix || undefined;
}

export function getConfigReferenceSummaryRows(container: unknown): ConfigReferenceSummaryRow[] {
  return parseEnvFrom((container as { envFrom?: unknown } | undefined)?.envFrom).map(reference => ({
    ...reference,
    label: reference.kind === 'configMap' ? 'FROM_CONFIGMAP' : 'FROM_SECRET',
  }));
}
