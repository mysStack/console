// 复核三类 Workload 配置引用只保留 V4 原生路由和页面，不访问集群或修改资源。
const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const componentDir = path.join(
  root,
  'packages/console/src/pages/projects/components/ConfigReference',
);
const forbidden = [
  /useV3action\s*\(/,
  /from ['"]wujie-react['"]/,
  /consoleV3Actions/,
  /action:\s*['"]workload\.template\.edit/,
];
const productionFiles = readdirSync(componentDir)
  .filter(file => /\.tsx?$/.test(file) && !file.endsWith('.test.ts'))
  .sort();
const forbiddenMatches = [];
for (const file of productionFiles) {
  const source = readFileSync(path.join(componentDir, file), 'utf8');
  forbidden.forEach(pattern => {
    if (pattern.test(source)) forbiddenMatches.push({ file, pattern: pattern.source });
  });
}

const routeModules = {
  deployments: 'Deployments',
  statefulsets: 'StatefulSets',
  daemonsets: 'DaemonSets',
};
const routes = Object.entries(routeModules).map(([module, directory]) => {
  const routePath = path.join(
    root,
    `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/${directory}/Detail/routes.tsx`,
  );
  const source = readFileSync(routePath, 'utf8');
  return {
    module,
    path: path.relative(root, routePath),
    hasNativeRoute: source.includes("path: 'config-reference'"),
    hasNativePage: source.includes(`<ConfigReferencePage module="${module}" />`),
    hasLegacyBridge: /useConfigReferenceBridge|useV3action|wujie/i.test(source),
  };
});

const removedFiles = ['entry.tsx', 'bridge.ts', 'bridge.test.ts'].map(file => ({
  file,
  present: existsSync(path.join(componentDir, file)),
}));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const result = {
  date: new Date().toISOString(),
  sourceCommit,
  scope: 'Deployment, StatefulSet, DaemonSet project config-reference routes',
  productionFiles,
  forbiddenMatches,
  removedFiles,
  routes,
  checks: {
    noForbiddenRuntimeDependency: forbiddenMatches.length === 0,
    legacyBridgeFilesRemoved: removedFiles.every(item => !item.present),
    allNativeRoutes: routes.every(
      item => item.hasNativeRoute && item.hasNativePage && !item.hasLegacyBridge,
    ),
  },
};

console.log(JSON.stringify(result, null, 2));
if (Object.values(result.checks).some(value => !value)) process.exitCode = 1;
