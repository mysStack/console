import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (relative: string) => readFileSync(path.join(__dirname, relative), 'utf8');

test('cluster-level V3 embeds keep the shared consolev3 app alive', () => {
  for (const file of [
    'Workload/Pods/Embed.tsx',
    'Clusters/Embed.tsx',
    'Clusters/ClusterTags/Embed.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /ConsoleV3ResourceList/, `${file} must use the shared host`);
    assert.doesNotMatch(source, /from 'wujie-react'/, `${file} must not mount WujieReact directly`);
  }
});
