import assert from 'node:assert/strict';
import test from 'node:test';

import { createConfigReferenceNativeCallbacks } from './nativeEdit';

const template = {
  metadata: { annotations: { owner: 'qa' } },
  spec: {
    template: {
      spec: {
        containers: [
          {
            name: 'main',
            env: [{ name: 'DB', value: '222' }],
            envFrom: [{ configMapRef: { name: 'main-cm' } }],
          },
          { name: 'nginx', image: 'nginx:new', envFrom: [{ secretRef: { name: 'old-secret' } }] },
        ],
      },
    },
  },
};

test('native final confirmation sends one complete merged object through the original store', async () => {
  const sent: any[] = [];
  const detail = { name: 'example', namespace: 'qa', cluster: 'host' };
  let closed = 0,
    saved = 0,
    cancelled = 0;
  const callbacks = createConfigReferenceNativeCallbacks({
    detail,
    getChanges: () => [{ containerName: 'nginx', references: [], reloaderEnabled: false }],
    onSaved: () => {
      saved += 1;
    },
    onCancelled: () => {
      cancelled += 1;
    },
    onError: error => {
      throw error;
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async (original: any, data: any) => {
          sent.push({ original, data });
        },
      },
      onCancel: () => {
        closed += 1;
        callbacks.onCancel();
        callbacks.ref(null);
      },
    },
  });
  assert.equal(sent.length, 0, 'opening and staging must not write');
  await callbacks.onOk(template);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].original, detail);
  assert.deepEqual(sent[0].data.spec.template.spec.containers, [
    {
      name: 'main',
      env: [{ name: 'DB', value: '222' }],
      envFrom: [{ configMapRef: { name: 'main-cm' } }],
    },
    { name: 'nginx', image: 'nginx:new' },
  ]);
  assert.deepEqual(template.spec.template.spec.containers[1].envFrom, [
    { secretRef: { name: 'old-secret' } },
  ]);
  assert.equal(closed, 1);
  assert.equal(saved, 1);
  assert.equal(cancelled, 0, 'closing a saved modal must not report a user cancellation');
});

test('cancelling a staged native edit sends no write and prevents a late submission', async () => {
  const sent: any[] = [];
  let cancelled = 0;
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [{ containerName: 'nginx', references: [], reloaderEnabled: false }],
    onSaved: () => assert.fail('cancelled edit cannot save'),
    onCancelled: () => {
      cancelled += 1;
    },
    onError: () => assert.fail('no error expected'),
  });
  callbacks.ref({
    props: {
      store: {
        update: async (...args: any[]) => {
          sent.push(args);
        },
      },
      onCancel: () => {},
    },
  });
  callbacks.onCancel();
  await callbacks.onOk(template);
  assert.equal(cancelled, 1);
  assert.equal(sent.length, 0);
});

test('store failure leaves the modal open and the draft can be corrected and submitted again', async () => {
  let fail = true,
    closed = 0,
    saved = 0;
  const errors: unknown[] = [],
    sent: any[] = [];
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [{ containerName: 'nginx', references: [], reloaderEnabled: false }],
    onSaved: () => {
      saved += 1;
    },
    onCancelled: () => {},
    onError: error => {
      errors.push(error);
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async (_detail: any, data: any) => {
          sent.push(data);
          if (fail) throw new Error('synthetic conflict');
        },
      },
      onCancel: () => {
        closed += 1;
      },
    },
  });
  await callbacks.onOk(template);
  assert.equal(errors.length, 1);
  assert.equal(closed, 0);
  assert.equal(saved, 0);
  fail = false;
  await callbacks.onOk(template);
  assert.equal(sent.length, 2);
  assert.equal('envFrom' in sent[1].spec.template.spec.containers[1], false);
  assert.equal(closed, 1);
  assert.equal(saved, 1);
});

test('repeated final confirmations while the first update is pending send only one write', async () => {
  let finish: () => void = () => assert.fail('no pending operation');
  const sent: any[] = [];
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [],
    onSaved: () => {},
    onCancelled: () => {},
    onError: error => {
      throw error;
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async (_detail: any, data: any) => {
          sent.push(data);
          await new Promise<void>(resolve => {
            finish = resolve;
          });
        },
      },
      onCancel: () => {},
    },
  });
  const first = callbacks.onOk(template);
  await callbacks.onOk(template);
  assert.equal(sent.length, 1);
  finish();
  await first;
  await callbacks.onOk(template);
  assert.equal(sent.length, 1, 'a committed session cannot submit again');
});

test('closing during an issued update reports its eventual commit without cancelling or closing twice', async () => {
  let finish!: () => void;
  let closed = 0,
    saved = 0,
    cancelled = 0;
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [],
    onSaved: () => {
      saved += 1;
    },
    onCancelled: () => {
      cancelled += 1;
    },
    onError: error => {
      throw error;
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async () => {
          await new Promise<void>(resolve => {
            finish = resolve;
          });
        },
      },
      onCancel: () => {
        closed += 1;
      },
    },
  });
  const pending = callbacks.onOk(template);
  callbacks.onCancel();
  callbacks.ref(null);
  assert.equal(cancelled, 0, 'closing cannot undo a request already issued');
  finish();
  await pending;
  assert.equal(saved, 1);
  assert.equal(cancelled, 0);
  assert.equal(closed, 0, 'the native modal is already closed');
});

test('closing during a failed update clears the closed session without reporting a save', async () => {
  let fail!: (error: Error) => void;
  let saved = 0,
    cancelled = 0;
  const errors: unknown[] = [];
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [],
    onSaved: () => {
      saved += 1;
    },
    onCancelled: () => {
      cancelled += 1;
    },
    onError: error => {
      errors.push(error);
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async () => {
          await new Promise<void>((_resolve, reject) => {
            fail = reject;
          });
        },
      },
      onCancel: () => assert.fail('the modal is already closed'),
    },
  });
  const pending = callbacks.onOk(template);
  callbacks.onCancel();
  callbacks.ref(null);
  fail(new Error('synthetic update failure'));
  await pending;
  assert.equal(saved, 0);
  assert.equal(cancelled, 1);
  assert.equal(errors.length, 1);
});

test('final submission retains native cleanup of UI-only customMode without changing the source form', async () => {
  const data = {
    spec: {
      template: {
        spec: {
          customMode: { scheduling: true },
          containers: [{ name: 'main', image: 'example:new' }],
        },
      },
    },
  };
  let submitted: any;
  const callbacks = createConfigReferenceNativeCallbacks({
    detail: {},
    getChanges: () => [],
    onSaved: () => {},
    onCancelled: () => {},
    onError: error => {
      throw error;
    },
  });
  callbacks.ref({
    props: {
      store: {
        update: async (_detail, value) => {
          submitted = value;
        },
      },
      onCancel: () => {},
    },
  });
  await callbacks.onOk(data);
  assert.equal('customMode' in submitted.spec.template.spec, false);
  assert.deepEqual(submitted.spec.template.spec.containers, [
    { name: 'main', image: 'example:new' },
  ]);
  assert.deepEqual(data.spec.template.spec.customMode, { scheduling: true });
});
