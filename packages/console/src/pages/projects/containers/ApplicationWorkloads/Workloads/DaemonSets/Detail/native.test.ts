import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('project DaemonSet detail is native and has no V3 bridge', () => {
  assert.doesNotMatch(source, /useV3action|WujieReact|wujie-react|consolev3/);
  assert.match(source, /const module = 'daemonsets'/);
  assert.match(source, /useCommonActions/);
});

test('DaemonSet 详情请求失败时提供明确错误处理', () => {
  assert.match(source, /getWorkloadDetailErrorPath/);
  assert.match(source, /navigate\(detailErrorPath, \{ replace: true \}\)/);
  assert.match(source, /WORKLOAD_DETAIL_LOAD_FAILED/);
});

test('DaemonSet 删除请求失败时显示错误提示并保留确认弹窗', () => {
  assert.match(
    source,
    /useDeleteDeploymentMutation\([\s\S]*?onError:\s*\(\)\s*=>\s*\{[\s\S]*?notify\.error\(t\('OPERATION_FAILED'\)\)/,
  );
});
