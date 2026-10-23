import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
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

test('三类 Workload 配置引用只使用原生路由且生产代码不依赖 V3/Wujie', () => {
  const productionSources = readdirSync(__dirname)
    .filter(file => /\.tsx?$/.test(file) && !file.endsWith('.test.ts'))
    .map(file => readFileSync(path.join(__dirname, file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(
    productionSources,
    /useV3action\s*\(|from ['"]wujie-react['"]|consoleV3Actions|action:\s*['"]workload\.template\.edit/,
  );

  for (const module of ['Deployments', 'StatefulSets', 'DaemonSets']) {
    const routes = readFileSync(
      path.resolve(
        __dirname,
        `../../containers/ApplicationWorkloads/Workloads/${module}/Detail/routes.tsx`,
      ),
      'utf8',
    );
    assert.match(routes, /path: 'config-reference'/);
    assert.match(routes, /<ConfigReferencePage module="(deployments|statefulsets|daemonsets)" \/>/);
  }
});
