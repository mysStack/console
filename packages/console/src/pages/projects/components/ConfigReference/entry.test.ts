import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { getConfigReferencePath } from './path';

test('builds a project workload config-reference path', () => {
  assert.equal(
    getConfigReferencePath({
      workspace: 'dev-workspace',
      cluster: 'host',
      namespace: 'dev-wes',
      module: 'deployments',
      name: 'wes-v2-server',
    }),
    '/dev-workspace/clusters/host/projects/dev-wes/deployments/wes-v2-server/config-reference',
  );
});

test('工作台 Wujie 在宿主 document 拦截编辑设置，避免下拉菜单门户漏掉配置引用', () => {
  const src = readFileSync(join(__dirname, 'entry.tsx'), 'utf8');
  assert.match(src, /getConfigReferenceNativeEditRoots\(/);
  assert.match(src, /installConfigReferenceNativeEdit\(document/);
});

test('环境变量页用已有卡片扫描扫全部 Wujie 根，不只扫编辑表单根', () => {
  const src = readFileSync(join(__dirname, 'entry.tsx'), 'utf8');
  assert.match(src, /resolveConfigReferenceEnvRoot\(collectRoots\(\)\)/);
  assert.match(src, /findConfigReferenceEnvSections\(envRoot\)/);
});

test('工作台 Wujie alive 复用实例时 activated 也要挂配置引用桥', () => {
  const files = [
    join(__dirname, '../../containers/Deployments/Detail/index.tsx'),
    join(__dirname, '../../containers/DaemonSets/Detail/index.tsx'),
    join(__dirname, '../../containers/StatefulSets/Detail/index.tsx'),
  ];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /activated=\{/, `${file} must bind the bridge on Wujie activated`);
  }
  const deployment = readFileSync(
    join(__dirname, '../../containers/Deployments/Detail/index.tsx'),
    'utf8',
  );
  assert.match(deployment, /afterMount\(appWindow\)/);
});
