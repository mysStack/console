import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const detailFiles = [
  ['Services', 'services'],
  ['Volumes', 'volumes'],
] as const;

detailFiles.forEach(([resource, route]) => {
  test(`${resource} detail keeps the shared consolev3 instance alive`, () => {
    const source = readFileSync(
      __filename.replace(/Base\/BaseLayout\/[^/]+$/, `${resource}/Detail/index.tsx`),
      'utf8',
    );
    assert.match(source, new RegExp(`url=.*\\/${route}\\/`));
    assert.match(source, /name="consolev3"/);
    assert.match(source, /alive/);
  });
});

test('project Deployment, StatefulSet and DaemonSet details do not retain V3 wrappers', () => {
  for (const resource of ['Deployments', 'StatefulSets', 'DaemonSets']) {
    const path = __filename.replace(/Base\/BaseLayout\/[^/]+$/, `${resource}/Detail/index.tsx`);
    assert.equal(existsSync(path), false, `${resource} must use the native detail route`);
  }
});
