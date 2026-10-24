// 仅验证 131 专用测试 namespace 的 Deployment 顶层元数据 API 校验，不保存任何资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const labelSelector = 'v4-migration-e2e=top-metadata-dryrun';
const server = execFileSync(
  'kubectl',
  [
    '--context',
    context,
    'config',
    'view',
    '--minify',
    '-o',
    'jsonpath={.clusters[0].cluster.server}',
  ],
  { encoding: 'utf8' },
).trim();
if (server !== 'https://192.168.2.131:6443') throw new Error('目标集群不是已授权的 131');

const version = JSON.parse(
  execFileSync('kubectl', ['--context', context, 'version', '-o', 'json'], { encoding: 'utf8' }),
).serverVersion.gitVersion;
const resource = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
const {buildDeployment}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const stamp=Date.now();
process.stdout.write(JSON.stringify(buildDeployment({
  name:'v4-top-metadata-dryrun-'+stamp,
  namespace:'${namespace}',
  aliasName:'顶层元数据服务端校验',
  description:'server dry-run only',
  replicas:1,
  workloadLabels:{'v4-migration-e2e':'top-metadata-dryrun','example.com/owner':'workloads'},
  workloadAnnotations:{'example.com/reviewer':'module-verify','kubesphere.io/alias-name':'不得覆盖系统别名'},
  podAnnotations:{'example.com/template':'kept-separate'},
  containers:[{name:'web',image:'nginx:alpine'}],
})));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

const dryRun = spawnSync(
  'kubectl',
  ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'json'],
  { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
);
const returned = dryRun.status === 0 ? JSON.parse(dryRun.stdout) : null;
const labels = resource.metadata.labels || {};
const selectorLabels = resource.spec.selector.matchLabels || {};
const templateLabels = resource.spec.template.metadata.labels || {};
const result = {
  kind: resource.kind,
  expected: 'accepted',
  passed: dryRun.status === 0,
  result: returned ? `${returned.kind}/${returned.metadata.name}` : '',
  error: dryRun.stderr.trim(),
  checks: {
    customLabelRetained: labels['example.com/owner'] === 'workloads',
    systemAppLabelWins: labels.app === resource.metadata.name,
    labelsSynchronized:
      JSON.stringify(labels) === JSON.stringify(selectorLabels) &&
      JSON.stringify(labels) === JSON.stringify(templateLabels),
    systemAliasWins:
      resource.metadata.annotations['kubesphere.io/alias-name'] === '顶层元数据服务端校验',
    podAnnotationKeptSeparate:
      resource.spec.template.metadata.annotations['example.com/template'] === 'kept-separate' &&
      resource.metadata.annotations['example.com/template'] === undefined,
  },
};
const residualResources = execFileSync(
  'kubectl',
  ['--context', context, '-n', namespace, 'get', 'deployments', '-l', labelSelector, '-o', 'name'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const uncommittedSourceFiles = execFileSync(
  'git',
  [
    'status',
    '--porcelain',
    '--',
    'packages/console/src/pages/projects/components/WorkloadCreateModal',
    'locales',
  ],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(
  JSON.stringify(
    {
      date: new Date().toISOString(),
      sourceCommit,
      uncommittedSourceFiles,
      server,
      version,
      namespace,
      mode: 'server dry-run; no resource persisted',
      residualResources,
      result,
    },
    null,
    2,
  ),
);
if (
  !result.passed ||
  Object.values(result.checks).some(value => !value) ||
  residualResources.length
)
  process.exitCode = 1;
