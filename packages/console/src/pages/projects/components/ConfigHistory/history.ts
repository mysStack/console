/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * Reading side of the ConfigMap / Secret modification history (sub-project C).
 *
 * The controller stores the records in a Secret named `<name>-history`, in the same
 * namespace as the source object, as base64(gzip(json array)). This module turns that
 * payload back into records and into the two texts the diff viewer needs.
 *
 * It is transport free on purpose: it takes the payload and returns data. Fetching the
 * Secret belongs to the page, so this part stays fully testable.
 */

/** One modification record, mirroring the Go type in pkg/controller/confighistory. */
export interface HistoryRecord {
  revision: number;
  createdAt: string;
  managedBy: string;
  managedByRef?: string;
  contentHash: string;
  content?: Record<string, string>;
  contentOmitted?: boolean;
}

export const HISTORY_SECRET_SUFFIX = '-history';
export const HISTORY_DATA_KEY = 'records';

/** The "managed by" values the backend derives from annotations. */
export const MANAGED_BY_HELM = 'helm';
export const MANAGED_BY_REPLICATOR = 'replicator';
export const MANAGED_BY_DIRECT = 'direct';

/** Name of the history Secret that belongs to a source object. */
export const historySecretName = (sourceName: string): string =>
  `${sourceName}${HISTORY_SECRET_SUFFIX}`;

/** Whether a Secret name looks like one of our history objects. */
export const isHistorySecretName = (name: string): boolean => name.endsWith(HISTORY_SECRET_SUFFIX);

/**
 * Decodes a history payload.
 *
 * gzip is inflated with the platform's own DecompressionStream, so no extra dependency
 * is needed. Anything malformed throws, because silently showing an empty history would
 * be worse than showing an error.
 */
export async function decodeHistoryPayload(payload?: string | null): Promise<HistoryRecord[]> {
  const trimmed = (payload || '').trim();
  if (!trimmed) {
    return [];
  }

  const binary = atob(trimmed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('history payload is not a list of records');
  }
  return parsed as HistoryRecord[];
}

/**
 * Renders one record's content as the text the diff viewer compares. Keys are sorted so
 * the diff shows real changes instead of reordering noise.
 */
export function recordText(record: HistoryRecord): string {
  if (record.contentOmitted) {
    return '// content omitted: this revision was larger than the recorded limit';
  }
  const content = record.content || {};
  const keys = Object.keys(content).sort();
  if (!keys.length) {
    return '';
  }
  return keys.map(key => `${key}: ${content[key]}`).join('\n');
}

/**
 * The pair of texts for comparing a record against the previous one, which is the shape
 * @kubed/diff-viewer expects.
 */
export function diffPair(
  records: HistoryRecord[],
  revision: number,
): { oldValue: string; newValue: string; comparedRevision?: number } {
  const index = records.findIndex(record => record.revision === revision);
  if (index < 0) {
    return { oldValue: '', newValue: '' };
  }
  const current = records[index];
  const previous = records[index + 1];
  return {
    oldValue: previous ? recordText(previous) : '',
    newValue: recordText(current),
    comparedRevision: previous ? previous.revision : undefined,
  };
}

/** The newest record, which is the current state of the object. */
export const currentRecord = (records: HistoryRecord[]): HistoryRecord | undefined => records[0];
