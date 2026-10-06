import type { EnvFromReference } from './types';

/**
 * A key only becomes an environment variable if its final name (prefix + key) is
 * accepted by kubelet. Anything else is DROPPED SILENTLY, and since
 * kubernetes/kubernetes#130099 no event is emitted either — so the UI is the
 * only place that can tell the user.
 *
 * This is deliberately the STRICT C-identifier form. Kubernetes relaxed env var
 * name validation behind an alpha feature gate (kubernetes/kubernetes#123385);
 * a cluster WITHOUT that gate dropped a key containing '.' with no warning at
 * all (#130099, on v1.30.5). Over-flagging a key that happens to work is a minor
 * annoyance; staying silent about a dropped key defeats the feature.
 *
 * Calibrate this against a real cluster before widening it.
 */
export const ENV_FROM_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Secret key names cannot be read without transferring `Secret.data` over the
 * wire: Kubernetes has no keys-only API (PartialObjectMetadataList returns
 * metadata only, not even a key count). Leaving this off keeps the panel's
 * promise —「不读取或展示 Secret 内容」— literally true, because Secret objects
 * are never fetched at all.
 *
 * Turning it on requires updating CONFIG_REFERENCE_SECRET_NOTICE: values are
 * still never decoded, stored or displayed, but they do reach the browser.
 */
export const PREVIEW_SECRET_KEYS = false;

/** Keys available on a referenced ConfigMap/Secret. Values are never read here. */
export interface ResourceKeys {
  /** Keys of `data` — these are what envFrom turns into environment variables. */
  data: string[];
  /** Keys of `binaryData` (ConfigMap only). envFrom ignores it entirely. */
  binaryData: string[];
}

export const EMPTY_RESOURCE_KEYS: ResourceKeys = { data: [], binaryData: [] };

export type PreviewEntryStatus = 'ok' | 'skipped' | 'binary';

export interface PreviewEntry {
  /** The key as it appears on the resource. */
  key: string;
  /** The environment variable name it would produce. */
  name: string;
  /**
   * ok      — becomes an environment variable
   * skipped — invalid name; kubelet drops it without any event
   * binary  — lives in binaryData; envFrom never reads it
   */
  status: PreviewEntryStatus;
}

export interface ReferencePreview {
  /** False when the referenced resource's keys could not be loaded. */
  resolved: boolean;
  /** Every key of the resource, in resource order. */
  entries: PreviewEntry[];
  /** Environment variable names this reference will create. */
  names: string[];
  /** `data` keys whose resulting name is invalid, so kubelet drops them. */
  skipped: string[];
  /** `binaryData` keys. envFrom never consumes them, valid name or not. */
  ignoredBinary: string[];
  /** Names that more than one reference row (including this one) produces. */
  duplicated: string[];
  /** Names a manually defined environment variable already occupies. */
  shadowedByEnv: string[];
}

export type KeysLookup = (reference: EnvFromReference) => ResourceKeys;

export interface PreviewOptions {
  pattern?: RegExp;
  /** Names typed into the V3 environment-variable rows, including unsaved edits. */
  manualEnvNames?: string[];
}

export const buildEnvFromName = (prefix: string, key: string): string => `${prefix}${key}`;

/**
 * Computes what one reference contributes, ignoring what the other rows do.
 */
export function previewReference(
  reference: EnvFromReference,
  keys: ResourceKeys,
  pattern: RegExp = ENV_FROM_NAME_PATTERN,
): Omit<ReferencePreview, 'duplicated' | 'shadowedByEnv'> {
  const prefix = typeof reference.prefix === 'string' ? reference.prefix : '';
  const entries: PreviewEntry[] = [];
  const names: string[] = [];
  const skipped: string[] = [];

  (keys.data || []).forEach(key => {
    const name = buildEnvFromName(prefix, key);
    const ok = pattern.test(name);
    entries.push({ key, name, status: ok ? 'ok' : 'skipped' });
    if (ok) {
      names.push(name);
    } else {
      skipped.push(key);
    }
  });

  const ignoredBinary = [...(keys.binaryData || [])];
  ignoredBinary.forEach(key => {
    entries.push({ key, name: buildEnvFromName(prefix, key), status: 'binary' });
  });

  return { resolved: true, entries, names, skipped, ignoredBinary };
}

/**
 * Computes the preview for every row, then fills in the cross-row facts: names
 * produced more than once, and names already taken by a manual environment
 * variable. Only names that actually materialise are considered, so a dropped
 * key never raises a duplicate or a conflict.
 */
export function previewReferences(
  rows: EnvFromReference[],
  keysOf: KeysLookup,
  options: PreviewOptions = {},
): ReferencePreview[] {
  const pattern = options.pattern || ENV_FROM_NAME_PATTERN;
  const envNames = new Set(
    (options.manualEnvNames || [])
      .map(name => (typeof name === 'string' ? name.trim() : ''))
      .filter(Boolean),
  );

  const partials = rows.map(row => {
    if (!row || !row.name) {
      return { resolved: false, entries: [], names: [], skipped: [], ignoredBinary: [] };
    }
    return previewReference(row, keysOf(row) || EMPTY_RESOURCE_KEYS, pattern);
  });

  const seen = new Map<string, number>();
  partials.forEach(partial => {
    partial.names.forEach(name => seen.set(name, (seen.get(name) || 0) + 1));
  });

  return partials.map(partial => ({
    ...partial,
    duplicated: partial.names.filter(name => (seen.get(name) || 0) > 1),
    shadowedByEnv: partial.names.filter(name => envNames.has(name)),
  }));
}
