/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

/**
 * First-view baseline for the modification history.
 *
 * History is deliberately not seeded for the whole cluster: an early version recorded every object in
 * scope at startup and created several hundred objects on an idle cluster. The baseline is written the
 * first time somebody actually looks at an object instead, so only objects people care about get one,
 * and the page never opens on an empty list for an object that has not changed yet.
 *
 * The record written here has to be byte-compatible with the controller's, or the controller will see
 * a hash it does not recognise and append a duplicate of the same content. The content hash is
 * therefore reproduced exactly: SHA-256 over the keys in sorted order, each contributing
 * "key\0value\0", UTF-8 -- the same bytes the Go side feeds to its hash.
 *
 * Failures are reported rather than swallowed. An earlier version returned a bare false and the whole
 * seeding step went silent: the page showed no records and nothing anywhere said why.
 */

import { HistoryRecord, managedByFromAnnotations } from './history';

const HISTORY_SECRET_SUFFIX = '-history';
const HISTORY_DATA_KEY = 'records';
const HISTORY_LABEL_KEY = 'config-history.kubesphere.io/for';
const HISTORY_LABEL_VALUE = 'true';
const LOG_PREFIX = '[config-history]';

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

async function describe(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return '(body unreadable)';
  }
}

/**
 * Writes the baseline record for an object that has no history yet. Returns true when a history exists
 * afterwards. Every failure is logged with the request, the status and the body, so the next round of
 * testing has something to read instead of a silent no-op.
 */
export async function seedHistory(params: {
  cluster: string;
  namespace: string;
  kind: 'ConfigMap' | 'Secret';
  name: string;
  object: any;
}): Promise<boolean> {
  const { cluster, namespace, kind, name, object } = params;
  const secretName = `${name}${HISTORY_SECRET_SUFFIX}`;
  try {
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
    const body = JSON.stringify({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace,
        labels: { [HISTORY_LABEL_KEY]: HISTORY_LABEL_VALUE },
      },
      type: 'Opaque',
      data: { [HISTORY_DATA_KEY]: await encodeRecords(records) },
    });
    const detailUrl = `/clusters/${cluster}/api/v1/namespaces/${namespace}/secrets/${secretName}`;
    const collectionUrl = `/clusters/${cluster}/api/v1/namespaces/${namespace}/secrets`;
    const headers = { 'Content-Type': 'application/json' };

    const put = await fetch(detailUrl, { method: 'PUT', credentials: 'include', headers, body });
    if (put.ok) {
      return true;
    }
    if (put.status === 409) {
      // The controller created it first, which is fine: a history exists either way.
      return true;
    }
    const putBody = await describe(put);
    console.error(`${LOG_PREFIX} seed via PUT failed`, {
      url: detailUrl,
      status: put.status,
      body: putBody,
    });

    const post = await fetch(collectionUrl, {
      method: 'POST',
      credentials: 'include',
      headers,
      body,
    });
    if (post.ok || post.status === 409) {
      return true;
    }
    console.error(`${LOG_PREFIX} seed via POST failed`, {
      url: collectionUrl,
      status: post.status,
      body: await describe(post),
    });
    return false;
  } catch (error) {
    console.error(`${LOG_PREFIX} seed threw`, {
      secret: secretName,
      message: (error as Error)?.message,
    });
    return false;
  }
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
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      console.error(`${LOG_PREFIX} seed could not read the object`, {
        url,
        status: response.status,
        body: await describe(response),
      });
      return false;
    }
    const object = await response.json();
    return await seedHistory({ cluster, namespace, kind, name, object });
  } catch (error) {
    console.error(`${LOG_PREFIX} reading the object threw`, {
      url,
      message: (error as Error)?.message,
    });
    return false;
  }
}
