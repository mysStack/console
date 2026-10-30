/*
 * Please refer to the LICENSE file in the root of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert';
import test from 'node:test';

import { destroyConsoleV3Instance } from './destroy';

test('ConsoleV3 destroys the app only after its unmount finished', async () => {
  const events: string[] = [];
  let finishUnmount: () => void = () => {};
  const sandbox = {
    unmount: () =>
      new Promise<void>(resolve => {
        events.push('unmount-start');
        finishUnmount = () => {
          events.push('unmount-done');
          resolve();
        };
      }),
  };

  const pending = destroyConsoleV3Instance(sandbox, () => events.push('destroyApp'));
  await Promise.resolve();
  assert.deepEqual(events, ['unmount-start']);

  finishUnmount();
  await pending;
  assert.deepEqual(events, ['unmount-start', 'unmount-done', 'destroyApp']);
});

test('ConsoleV3 destroys the app even when unmount rejects', async () => {
  const events: string[] = [];
  await destroyConsoleV3Instance({ unmount: () => Promise.reject(new Error('gone')) }, () =>
    events.push('destroyApp'),
  );

  assert.deepEqual(events, ['destroyApp']);
});

test('ConsoleV3 destroys the cached app when no sandbox is reachable', async () => {
  let destroyed = false;
  await destroyConsoleV3Instance(undefined, () => {
    destroyed = true;
  });

  assert.equal(destroyed, true);
});

test('ConsoleV3 waits for a synchronous unmount before destroying', async () => {
  const events: string[] = [];
  await destroyConsoleV3Instance({ unmount: () => events.push('unmount') }, () =>
    events.push('destroyApp'),
  );

  assert.deepEqual(events, ['unmount', 'destroyApp']);
});
