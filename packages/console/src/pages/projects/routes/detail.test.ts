import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'detail.tsx'), 'utf8');

test('project ServiceAccount detail route uses the lowercase resource path', () => {
  assert.match(source, /\$\{PATH\}\/serviceaccounts\/:name/);
  assert.doesNotMatch(source, /\$\{PATH\}\/serviceAccounts\/:name/);
});

test('project workload detail routes use native workload implementations', () => {
  assert.match(source, /nativeDeploymentDetailRoutes/);
  assert.match(source, /nativeStatefulSetDetailRoutes/);
  assert.match(source, /nativeDaemonSetDetailRoutes/);
  assert.doesNotMatch(
    source,
    /containers\/Deployments\/Detail['"]|containers\/StatefulSets\/Detail['"]|containers\/DaemonSets\/Detail['"]/,
  );
});
