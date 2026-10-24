// 验证当前源码生成的 DaemonSet 创建对象可通过 131 API Server 校验，不持久化资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const name = `v4-native-ds-dryrun-${Date.now()}`;
const labelSelector = 'v4-migration-e2e=daemonset-create-dryrun';
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
  execFileSync('kubectl', ['--context', context, 'version', '-o', 'json'], {
    encoding: 'utf8',
  }),
).serverVersion.gitVersion;
const resource = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
const {buildDaemonSet}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const resource=buildDaemonSet({
  name:'${name}',
  namespace:'${namespace}',
  replicas:7,
  workloadLabels:{'v4-migration-e2e':'daemonset-create-dryrun'},
  containers:[{name:'agent',image:'busybox:1.36',command:['sleep'],args:['3600']}],
  updateStrategy:{type:'RollingUpdate',maxUnavailable:'20%'},
  minReadySeconds:3,
  terminationGracePeriodSeconds:15,
  nodeSelector:{'kubernetes.io/os':'linux'},
});
process.stdout.write(JSON.stringify(resource));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const dryRun = spawnSync(
  'kubectl',
  ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
  { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
);
const residualResources = execFileSync(
  'kubectl',
  ['--context', context, '-n', namespace, 'get', 'daemonsets', '-l', labelSelector, '-o', 'name'],
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
    'packages/console/src/pages/projects/containers/DaemonSets',
    'locales',
  ],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
const checks = {
  accepted: dryRun.status === 0,
  isDaemonSet: resource.kind === 'DaemonSet' && resource.apiVersion === 'apps/v1',
  replicasAbsent: !Object.hasOwn(resource.spec, 'replicas'),
  strategyPreserved:
    resource.spec.updateStrategy?.type === 'RollingUpdate' &&
    resource.spec.updateStrategy?.rollingUpdate?.maxUnavailable === '20%',
  minReadySecondsPreserved: resource.spec.minReadySeconds === 3,
  terminationPreserved: resource.spec.template.spec.terminationGracePeriodSeconds === 15,
  namespacePreserved: resource.metadata.namespace === namespace,
  noResourcePersisted: residualResources.length === 0,
  exactCommittedSource: uncommittedSourceFiles.length === 0,
};

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
      result: dryRun.stdout.trim(),
      error: dryRun.stderr.trim(),
      residualResources,
      resourceSummary: {
        apiVersion: resource.apiVersion,
        kind: resource.kind,
        name: resource.metadata.name,
        hasReplicas: Object.hasOwn(resource.spec, 'replicas'),
        updateStrategy: resource.spec.updateStrategy,
        minReadySeconds: resource.spec.minReadySeconds,
        terminationGracePeriodSeconds: resource.spec.template.spec.terminationGracePeriodSeconds,
      },
      checks,
    },
    null,
    2,
  ),
);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
