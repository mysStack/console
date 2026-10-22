import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project Deployment list uses the native workload table and store', () => {
  assert.match(source, /DataTable/);
  assert.match(source, /workloadStore\(['"]deployments['"]\)/);
  assert.match(source, /useParams/);
  assert.match(source, /namespace/);
  assert.match(source, /deployments\/\$\{.*name/);
});

test('project Deployment list has no V3 list bridge', () => {
  assert.doesNotMatch(
    source,
    /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react|consolev3/,
  );
});

test('project Deployment list opens the native create form and submits through the store', () => {
  assert.match(source, /WorkloadCreateModal/);
  assert.match(source, /useCreateWorkloadMutation/);
  assert.match(source, /onClick:\s*createModal\.open/);
  assert.match(source, /params:\s*\{\s*cluster,\s*namespace\s*\}/);
});
