/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * First-view baseline for the modification history.
 *
 * History is deliberately not seeded for the whole cluster: an early version recorded every object
 * in scope at startup and created several hundred objects on an idle cluster. The baseline is written
 * the first time somebody actually looks at an object instead, so only objects people care about get
 * one, and the page never opens on an empty list for an object that has not changed yet.
 *
 * The record written here has to be byte-compatible with the controller's, or the controller will see
 * a hash it does not recognise and append a duplicate of the same content. The content hash is
 * therefore reproduced exactly: SHA-256 over the keys in sorted order, each contributing
 * "key\0value\0", UTF-8 -- the same bytes the Go side feeds to its hash.
 */

import { HistoryRecord, managedByFromAnnotations } from './history';

const HISTORY_SECRET_SUFFIX = '-history';
const HISTORY_DATA_KEY = 'records';
const HISTORY_LABEL_KEY = 'config-history.kubesphere.io/for';
const HISTORY_LABEL_VALUE = 'true';

/** Same bytes as the controller's ContentHash: sorted keys, "key\0value\0" each, UTF-8. */
export async function contentHash(content: Record<string, string>): Promise<string> {
  const keys = Object.keys(content).sort();
  const parts = keys.map(key => `${key}\u0000${content[key]}\u0000`).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * gzip then base64, the shape the controller writes into the Secret.
 *
 * CompressionStream is not in this project's TS lib yet, so the constructor is reached through a
 * narrow cast rather than widening the module to any -- the same approach the decoder uses.
 */
export async function encodeRecords(records: HistoryRecord[]): Promise<string> {
  const CompressionStreamCtor = (
    globalThis as unknown as { CompressionStream?: new (format: string) => unknown }
  ).CompressionStream;
  if (!CompressionStreamCtor) {
    throw new Error('this runtime cannot compress the history payload');
  }
  const stream = (
    new Blob([JSON.stringify(records)]).stream() as unknown as {
      pipeThrough: (transform: unknown) => ReadableStream;
    }
  ).pipeThrough(new CompressionStreamCtor('gzip'));
  const buffer = await new Response(stream as unknown as BodyInit).arrayBuffer();
  let binary = '';
  new Uint8Array(buffer).forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/** The content of an object as the controller would record it. */
export function contentOfObject(object: any, kind: 'ConfigMap' | 'Secret'): Record<string, string> {
  const out: Record<string, string> = {};
  if (kind === 'ConfigMap') {
    Object.entries(object?.data || {}).forEach(([key, value]) => {
      out[key] = String(value);
    });
    Object.entries(object?.binaryData || {}).forEach(([key, value]) => {
      out[key] = String(value);
    });
    return out;
  }
  // A Secret's values arrive base64 encoded; the controller stores the decoded text, so decode here
  // too, or the two sides would disagree about the content.
  Object.entries(object?.data || {}).forEach(([key, value]) => {
    try {
      out[key] = decodeURIComponent(escape(atob(String(value))));
    } catch {
      out[key] = String(value);
    }
  });
  return out;
}

/**
 * Writes the baseline record for an object that has no history yet. Returns true when a history
 * exists afterwards. Anything that fails is left to the caller: an unwritten baseline only means the
 * list stays empty until the object changes, which is the previous behaviour.
 */
export async function seedHistory(params: {
  cluster: string;
  namespace: string;
  kind: 'ConfigMap' | 'Secret';
  name: string;
  object: any;
}): Promise<boolean> {
  const { cluster, namespace, kind, name, object } = params;
  const content = contentOfObject(object, kind);
  const owner = managedByFromAnnotations(object?.metadata?.annotations);
  const records: HistoryRecord[] = [
    {
      revision: 1,
      createdAt: new Date().toISOString(),
      managedBy: owner.managedBy,
      managedByRef: owner.managedByRef,
      contentHash: await contentHash(content),
      content,
    },
  ];
  const name2 = `${name}${HISTORY_SECRET_SUFFIX}`;
  const url = `/clusters/${cluster}/api/v1/namespaces/${namespace}/secrets/${name2}`;
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: name2,
        namespace,
        labels: { [HISTORY_LABEL_KEY]: HISTORY_LABEL_VALUE },
      },
      type: 'Opaque',
      data: { [HISTORY_DATA_KEY]: await encodeRecords(records) },
    }),
  });
  if (response.ok) {
    return true;
  }
  // 409 means the controller created it first, which is fine: a history exists either way.
  return response.status === 409;
}

/** Fetches the object itself, then writes the baseline. Keeps the format logic above transport free. */
export async function seedHistoryFor(params: {
  cluster: string;
  namespace: string;
  kind: 'ConfigMap' | 'Secret';
  name: string;
}): Promise<boolean> {
  const { cluster, namespace, kind, name } = params;
  const module = kind === 'ConfigMap' ? 'configmaps' : 'secrets';
  const url = `/clusters/${cluster}/api/v1/namespaces/${namespace}/${module}/${name}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    return false;
  }
  const object = await response.json();
  return seedHistory({ cluster, namespace, kind, name, object });
}
