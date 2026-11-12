import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('集群工作负载详情未取到 detail 时不得写入共享 store，避免直达 /env 读 namespace 崩溃', () => {
  const files = ['Deployments', 'StatefulSets', 'DaemonSets'].map(kind =>
    join(__dirname, kind, 'Detail', 'index.tsx'),
  );
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.match(
      src,
      /if\s*\(\s*!detail\s*\)\s*return/,
      `${file} must skip sharing an undefined detail`,
    );
    assert.match(src, /setDetailProps\(\{\s*module,\s*detail,\s*isLoading,\s*isError\s*\}\)/);
  }
});
