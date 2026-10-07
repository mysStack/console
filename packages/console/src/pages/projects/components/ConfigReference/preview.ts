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
 * Secret key names cannot be obtained without transferring `Secret.data` over
 * the wire: Kubernetes has no keys-only API (PartialObjectMetadataList returns
 * metadata only, not even a key count).
 *
 * Enabled, because the panel is useless for the case that matters most — a
 * Secret contributes 4 of 25 variables on a real deployment, and while this was
 * off those keys took part in neither the duplicate check nor the
 * dropped-key check. KubeSphere already shows Secret-derived variable NAMES in
 * the environment tab and only masks the values, so showing names is consistent.
 *
 * The keys are read with a RAW request (see ConfigReferenceInline) that bypasses
 * the shared Secret mapper, so values are never base64-decoded, stored or
 * rendered. They do still transit the wire. CONFIG_REFERENCE_SECRET_NOTICE says
 * exactly that and no more.
 */
export const PREVIEW_SECRET_KEYS = true;

/**
 * A `data` key, plus its value when it is safe to show one.
 *
 * Secret values are deliberately absent: they are never decoded, so there is
 * nothing to leak and the UI masks them exactly as KubeSphere masks its own
 * secret-backed environment variables. A ConfigMap value is always a string,
 * possibly empty — so `undefined` means "not read", never "empty".
 */
export interface ResourceKey {
  key: string;
  value?: string;
}

/** Keys available on a referenced ConfigMap/Secret. */
export interface ResourceKeys {
  /** What envFrom turns into environment variables. */
  data: ResourceKey[];
  /** Keys of `binaryData` (ConfigMap only). envFrom ignores it entirely. */
  binaryData: string[];
}

/**
 * A discriminated union rather than one interface with an optional `name`: a
 * binaryData key never becomes an environment variable, so carrying a computed
 * name for it was data nothing could legitimately read.
 */
export type PreviewEntry =
  | {
      /** The key as it appears on the resource. */
      key: string;
      /** The environment variable name it would produce. */
      name: string;
      /** Absent for Secret-backed keys, whose values are never read. */
      value?: string;
      /** ok — becomes an environment variable; skipped — invalid name, so kubelet drops it without emitting any event. */
      status: 'ok' | 'skipped';
    }
  | {
      key: string;
      /** lives in binaryData; envFrom never reads it */
      status: 'binary';
    };

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
  /**
   * The prefix is not a valid environment variable name, so the API rejects the
   * whole save (422) — per-key "will be dropped" reporting would be misleading.
   */
  invalidPrefix: boolean;
}

/**
 * Returns undefined while the keys are unknown — not loaded yet, or the fetch
 * failed. That is deliberately distinct from an empty ResourceKeys, which means
 * the resource really has no keys.
 */
export type KeysLookup = (reference: EnvFromReference) => ResourceKeys | undefined;

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

  if (prefix !== '' && !pattern.test(prefix)) {
    return {
      resolved: true,
      entries: [],
      names: [],
      skipped: [],
      ignoredBinary: [],
      invalidPrefix: true,
    };
  }

  const entries: PreviewEntry[] = [];
  const names: string[] = [];
  const skipped: string[] = [];

  (keys.data || []).forEach(entry => {
    const name = buildEnvFromName(prefix, entry.key);
    const ok = pattern.test(name);
    entries.push({
      key: entry.key,
      name,
      // A value is attached only when there is one to show: a dropped key has none,
      // and a Secret-backed key never had one read. Omitting the property (rather
      // than setting it to undefined) keeps entries comparable with deepStrictEqual.
      ...(ok && entry.value !== undefined ? { value: entry.value } : {}),
      status: ok ? 'ok' : 'skipped',
    });
    if (ok) {
      names.push(name);
    } else {
      skipped.push(entry.key);
    }
  });

  const ignoredBinary = [...(keys.binaryData || [])];
  ignoredBinary.forEach(key => {
    entries.push({ key, status: 'binary' });
  });

  return { resolved: true, entries, names, skipped, ignoredBinary, invalidPrefix: false };
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
      return {
        resolved: false,
        entries: [],
        names: [],
        skipped: [],
        ignoredBinary: [],
        invalidPrefix: false,
      };
    }
    const keys = keysOf(row);
    if (!keys) {
      // Reporting "no effective keys" here would be wrong twice over: it would be
      // a lie, and it is the exact symptom a genuinely empty resource shows.
      return {
        resolved: false,
        entries: [],
        names: [],
        skipped: [],
        ignoredBinary: [],
        invalidPrefix: false,
      };
    }
    return previewReference(row, keys, pattern);
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
