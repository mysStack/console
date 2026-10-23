import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { shouldPreloadConsoleV3 } from './wujieNativePreload';

const source = readFileSync(join(__dirname, 'wujie.ts'), 'utf8');

test('native Workload routes do not preload the legacy V3 applications', () => {
  assert.match(source, /shouldPreloadConsoleV3/);
  assert.match(source, /if \(!shouldPreloadConsoleV3\(window\.location\.pathname\)\)/);
  assert.match(source, /preloadApp\(/);
  assert.equal(
    shouldPreloadConsoleV3(
      '/test-workspace/clusters/host/projects/v4-migration-e2e/deployments/example/resource-status',
    ),
    false,
  );
  assert.equal(
    shouldPreloadConsoleV3(
      '/test-workspace/clusters/host/projects/v4-migration-e2e/statefulsets/example',
    ),
    false,
  );
  assert.equal(
    shouldPreloadConsoleV3('/test-workspace/clusters/host/projects/v4-migration-e2e/daemonsets'),
    false,
  );
});

test('legacy routes keep the existing V3 preload path', () => {
  assert.equal(
    shouldPreloadConsoleV3('/test-workspace/clusters/host/projects/v4-migration-e2e/configmaps'),
    true,
  );
  assert.equal(shouldPreloadConsoleV3('/clusters/host/overview'), true);
});
