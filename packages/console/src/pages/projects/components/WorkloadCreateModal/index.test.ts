import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');
const settingsSource = readFileSync(
  __filename.replace(/[^/]+$/, 'WorkloadSettingsModal.tsx'),
  'utf8',
);

test('Deployment 副本数使用 Kubed 支持的整数输入组件', () => {
  assert.match(source, /InputNumber/);
  assert.match(source, /<InputNumber min=\{0\} precision=\{0\} \/>/);
  assert.doesNotMatch(source, /NumberInput/);
});

test('工作容器与初始化容器变化时重新执行跨容器校验', () => {
  assert.match(
    source,
    /name="containers"[\s\S]*dependencies=\{\['initContainers', 'volumes', 'volumeClaimTemplates'\]\}/,
  );
  assert.match(
    source,
    /name="initContainers"[\s\S]*dependencies=\{\['containers', 'volumes', 'volumeClaimTemplates'\]\}/,
  );
});

test('Deployment 创建表单区分工作负载元数据和 Pod 模板注解并检查标签重复', () => {
  assert.match(source, /name="workloadLabels"/);
  assert.match(source, /name="workloadAnnotations"/);
  assert.match(source, /name="podAnnotations"/);
  assert.match(source, /checkLabels/);
  assert.match(source, /checkWorkloadLabelsAvailability/);
});

test('创建表单按资源类型渲染 StatefulSet/DaemonSet 字段并调用对应构建器', () => {
  assert.match(source, /kind\?: WorkloadKind/);
  assert.match(source, /buildDaemonSet/);
  assert.match(source, /buildStatefulSet/);
  assert.match(source, /kind !== 'DaemonSet'[\s\S]*name="replicas"/);
  assert.match(source, /kind === 'DaemonSet'[\s\S]*name="updateStrategy"/);
  assert.match(source, /name="minReadySeconds"/);
  assert.match(source, /name="terminationGracePeriodSeconds"/);
  assert.match(source, /kind === 'StatefulSet'[\s\S]*name="volumeClaimTemplates"/);
  assert.match(source, /withService=\{kind === 'StatefulSet'\}/);
});

test('三类 Workload 设置表单区分工作负载元数据和 Pod 模板注解', () => {
  assert.match(settingsSource, /name="workloadLabels"/);
  assert.match(settingsSource, /name="workloadAnnotations"/);
  assert.match(settingsSource, /name="podAnnotations"/);
  assert.match(settingsSource, /hiddenKeys=\{\['app'\]\}/);
});
