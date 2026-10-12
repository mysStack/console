/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import { gzipSync } from 'node:zlib';
import test from 'node:test';

import {
  HISTORY_SECRET_SUFFIX,
  decodeHistoryPayload,
  diffPair,
  historySecretName,
  isHistorySecretName,
  recordText,
} from './history';

/**
 * Builds a payload the same way the controller plus Kubernetes produces it, and both layers
 * matter: the controller stores base64(gzip(json)), and Kubernetes base64 encodes that again in
 * the Secret's data field. An earlier version of this helper modelled only the first layer, so it
 * agreed with a decoder that was missing the second one -- the page failed while the test passed.
 */
const encodeLikeTheController = (records: unknown): string =>
  Buffer.from(
    gzipSync(Buffer.from(JSON.stringify(records), 'utf8')).toString('base64'),
    'utf8',
  ).toString('base64');

const sample = [
  {
    revision: 2,
    createdAt: '2026-10-08T12:01:20Z',
    managedBy: 'replicator',
    managedByRef: '102574264',
    contentHash: 'h2',
    content: { DB_USERNAME: 'wes_writer', DB_WES_URL: 'postgres://10.96.31.9:5432/db' },
  },
  {
    revision: 1,
    createdAt: '2026-10-07T22:19:48Z',
    managedBy: 'helm',
    managedByRef: 'wes-server',
    contentHash: 'h1',
    content: { DB_USERNAME: 'wes_reader', DB_WES_URL: 'postgres://10.96.31.7:5432/db' },
  },
];

test('historySecretName and isHistorySecretName agree with the controller', () => {
  assert.equal(
    historySecretName('ewms-postgres-wes-config'),
    `ewms-postgres-wes-config${HISTORY_SECRET_SUFFIX}`,
  );
  assert.equal(isHistorySecretName('ewms-postgres-wes-config-history'), true);
  assert.equal(isHistorySecretName('ewms-postgres-wes-config'), false);
});

test('decodes a payload produced the way the controller produces it', async () => {
  const records = await decodeHistoryPayload(encodeLikeTheController(sample));

  assert.equal(records.length, 2);
  assert.equal(records[0].revision, 2);
  assert.equal(records[0].managedBy, 'replicator');
  assert.equal(records[0].managedByRef, '102574264');
  assert.equal(records[0].content?.DB_USERNAME, 'wes_writer');
  assert.equal(records[1].managedBy, 'helm');
  assert.equal(records[1].managedByRef, 'wes-server');
});

test('an empty or missing payload is an empty history, not an error', async () => {
  assert.deepEqual(await decodeHistoryPayload(undefined), []);
  assert.deepEqual(await decodeHistoryPayload(null), []);
  assert.deepEqual(await decodeHistoryPayload('   '), []);
});

test('a malformed payload throws instead of pretending the history is empty', async () => {
  await assert.rejects(() => decodeHistoryPayload('not-base64!!'), /Invalid|character/i);
  await assert.rejects(() =>
    decodeHistoryPayload(Buffer.from('not gzip at all').toString('base64')),
  );
});

test('recordText sorts keys so the diff shows changes rather than reordering', () => {
  assert.equal(
    recordText({
      revision: 1,
      createdAt: '',
      managedBy: 'direct',
      contentHash: 'h',
      content: { Z: 'last', A: 'first', M: 'middle' },
    }),
    'A: first\nM: middle\nZ: last',
  );
});

test('recordText states plainly when the content was omitted', () => {
  const text = recordText({
    revision: 3,
    createdAt: '',
    managedBy: 'direct',
    contentHash: 'h',
    contentOmitted: true,
  });
  assert.match(text, /content omitted/);
});

test('diffPair compares a record against the one before it', () => {
  const pair = diffPair(sample, 2);
  assert.equal(pair.comparedRevision, 1);
  assert.match(pair.newValue, /DB_USERNAME: wes_writer/);
  assert.match(pair.oldValue, /DB_USERNAME: wes_reader/);
});

test('diffPair on the oldest record compares against nothing', () => {
  const pair = diffPair(sample, 1);
  assert.equal(pair.comparedRevision, undefined);
  assert.equal(pair.oldValue, '');
  assert.match(pair.newValue, /DB_USERNAME: wes_reader/);
});

test('diffPair on an unknown revision returns empty values', () => {
  assert.deepEqual(diffPair(sample, 99), { oldValue: '', newValue: '' });
});
