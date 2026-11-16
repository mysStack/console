import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExtensionSDKInstaller } from './extensionSDK';

test('concurrent plugin imports share SDK registration and wait for it', async () => {
  const sdk = createExtensionSDKInstaller();
  let release!: () => void;
  let calls = 0;
  sdk.configure(() => {
    calls++;
    return new Promise<void>(resolve => {
      release = resolve;
    });
  });
  const first = sdk.install();
  const second = sdk.install();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  let imported = false;
  const plugin = second.then(() => {
    imported = true;
  });
  await Promise.resolve();
  assert.equal(imported, false);
  release();
  await plugin;
  assert.equal(imported, true);
  assert.equal(sdk.install(), first);
});

test('failed registration rejects every waiting plugin without duplicate initialization', async () => {
  const sdk = createExtensionSDKInstaller();
  const failure = new Error('SDK chunk unavailable');
  let calls = 0;
  sdk.configure(async () => {
    calls++;
    throw failure;
  });
  const results = await Promise.allSettled([sdk.install(), sdk.install()]);
  assert.equal(calls, 1);
  assert.ok(results.every(result => result.status === 'rejected' && result.reason === failure));
});

test('missing configuration fails before importing a plugin', async () => {
  await assert.rejects(createExtensionSDKInstaller().install(), /not configured/);
});
