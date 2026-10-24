import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project Deployment detail is native and has no V3 bridge', () => {
  assert.doesNotMatch(source, /useV3action|WujieReact|wujie-react|consolev3/);
  assert.match(source, /const module = 'deployments'/);
  assert.match(source, /useCommonActions/);
});

test('Deployment 编辑设置使用原生设置表单而不是 YAML 编辑器', () => {
  assert.match(source, /WorkloadSettingsModal/);
  const settingsAction = source.match(
    /key: 'editConfigTemplate'[\s\S]*?(?=\n\s*\{\n\s*key: 'editYaml')/,
  )?.[0];
  assert.ok(settingsAction);
  assert.match(settingsAction, /openSettingsModal/);
  assert.doesNotMatch(settingsAction, /editYaml/);
});

test('Deployment 详情请求失败时提供明确错误处理', () => {
  assert.match(source, /getWorkloadDetailErrorPath/);
  assert.match(source, /navigate\(detailErrorPath, \{ replace: true \}\)/);
  assert.match(source, /WORKLOAD_DETAIL_LOAD_FAILED/);
});
