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
 * SHA-256 is implemented here rather than taken from crypto.subtle, because crypto.subtle is only
 * available in a secure context and the console is served over plain http. Reaching for it threw
 * immediately, and because the throw happened inside this module's error handling the feature simply
 * stayed silent.
 *
 * Failures are reported rather than swallowed, for the same reason: an earlier version returned a bare
 * false and left nothing anywhere to explain why nothing had been written.
 */

import { HistoryRecord, managedByFromAnnotations } from './history';

const HISTORY_SECRET_SUFFIX = '-history';
const HISTORY_DATA_KEY = 'records';
const HISTORY_LABEL_KEY = 'config-history.kubesphere.io/for';
const HISTORY_LABEL_VALUE = 'true';
const LOG_PREFIX = '[config-history]';

/** SHA-256 of a UTF-8 string, as lowercase hex. */
export function sha256Hex(input: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i += 1;
      code = 0x10000 + (((code & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  for (let i = 7; i >= 0; i -= 1) {
    bytes.push(Math.floor(bitLength / 2 ** (i * 8)) & 0xff);
  }

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Array<number>(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = offset + i * 4;
      words[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = words[i - 15];
      const w2 = words[i - 2];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + k[i] + words[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    const next = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i += 1) {
      h[i] = (h[i] + next[i]) | 0;
    }
  }
  return h.map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

/** Same bytes as the controller's ContentHash: sorted keys, "key\0value\0" each, UTF-8. */
export function contentHash(content: Record<string, string>): string {
  const keys = Object.keys(content).sort();
  const parts = keys.map(key => `${key}\u0000${content[key]}\u0000`).join('');
  return sha256Hex(parts);
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
        contentHash: contentHash(content),
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
    if (put.ok || put.status === 409) {
      // 409 means the controller created it first, which is fine: a history exists either way.
      return true;
    }
    console.error(`${LOG_PREFIX} seed via PUT failed`, {
      url: detailUrl,
      status: put.status,
      body: await describe(put),
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
  console.info(`${LOG_PREFIX} no history yet, writing the baseline`, { url });
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
