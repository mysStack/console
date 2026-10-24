import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project StatefulSet list uses the native workload table and store', () => {
  assert.match(source, /DataTable/);
  assert.match(source, /workloadStore\(['"]statefulsets['"]\)/);
  assert.match(source, /useParams/);
  assert.match(source, /namespace/);
  assert.match(source, /statefulsets\/\$\{.*name/);
});

test('project StatefulSet list has no V3 list bridge', () => {
  assert.doesNotMatch(
    source,
    /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react|consolev3/,
  );
});

test('project StatefulSet list provides native dual-resource creation and visible failure feedback', () => {
  assert.match(source, /useCreateStatefulSetMutation/);
  assert.match(source, /WorkloadCreateModal/);
  assert.match(source, /kind="StatefulSet"/);
  assert.match(source, /onClick: createModal\.open/);
  assert.match(source, /notify\.error\(t\('CREATE_STATEFULSET_FAILED'\)\)/);
});

test('project StatefulSet YAML update validates input and reports save failures', () => {
  assert.match(source, /data: yaml\.loadStrict\(value\)/);
  assert.match(
    source,
    /onError: \(\) => \{\s*notify\.error\(t\('WORKLOAD_SETTINGS_SAVE_FAILED'\)\)/s,
  );
});
