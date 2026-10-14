import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const detailFiles = [
  ['Services', 'services'],
  ['Volumes', 'volumes'],
  ['StatefulSets', 'statefulsets'],
  ['DaemonSets', 'daemonsets'],
] as const;

for (const [resource, route] of detailFiles) {
  test(`${resource} detail keeps the shared consolev3 instance alive`, () => {
    const source = readFileSync(
      __filename.replace(/Base\/BaseLayout\/[^/]+$/, `${resource}/Detail/index.tsx`),
      'utf8',
    );
    assert.match(source, new RegExp(`url=.*\\/${route}\\/`));
    assert.match(source, /name="consolev3"/);
    assert.match(source, /alive/);
  });
}
