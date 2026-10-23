// 验证当前提交生成的 StatefulSet 与 Headless Service 可通过 131 API Server 校验，不持久化资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const suffix = String(Date.now());
const name = `v4-native-sts-dryrun-${suffix}`;
const serviceName = `${name.slice(0, 57)}-ab12`;
const labelSelector = 'v4-migration-e2e=statefulset-create-dryrun';
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
const resources = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
const {buildStatefulSet}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const resources=buildStatefulSet({
  name:'${name}',
  namespace:'${namespace}',
  replicas:1,
  workloadLabels:{'v4-migration-e2e':'statefulset-create-dryrun',tier:'database'},
  containers:[{
    name:'database',
    image:'postgres:16',
    ports:[{name:'sql',containerPort:5432,servicePort:15432,protocol:'TCP'}],
    volumeMounts:[{name:'data',mountPath:'/var/lib/postgresql/data'}],
  }],
  updateStrategy:{type:'RollingUpdate',partition:0},
  terminationGracePeriodSeconds:45,
  volumeClaimTemplates:[{
    name:'data',accessModes:['ReadWriteOnce'],storage:'1Gi',storageClassName:'local-path',
  }],
},'${serviceName}');
process.stdout.write(JSON.stringify(resources));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

function serverDryRun(resource) {
  return spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
  );
}

const serviceDryRun = serverDryRun(resources.service);
const workloadDryRun = serverDryRun(resources.workload);
const residualResources = execFileSync(
  'kubectl',
  [
    '--context',
    context,
    '-n',
    namespace,
    'get',
    'statefulsets,services',
    '-l',
    labelSelector,
    '-o',
    'name',
  ],
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
    'packages/console/src/pages/projects/containers/StatefulSets',
    'packages/shared/src/stores/workload',
    'locales',
  ],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
const workload = resources.workload;
const service = resources.service;
const checks = {
  serviceAccepted: serviceDryRun.status === 0,
  workloadAccepted: workloadDryRun.status === 0,
  isStatefulSet: workload.kind === 'StatefulSet' && workload.apiVersion === 'apps/v1',
  serviceBinding: workload.spec.serviceName === service.metadata.name,
  headlessService: service.kind === 'Service' && service.spec.clusterIP === 'None',
  serviceSelectorPreserved:
    service.spec.selector?.['v4-migration-e2e'] === 'statefulset-create-dryrun' &&
    service.spec.selector?.tier === 'database',
  servicePortPreserved:
    service.spec.ports?.[0]?.port === 15432 && service.spec.ports?.[0]?.targetPort === 5432,
  strategyPreserved:
    workload.spec.updateStrategy?.type === 'RollingUpdate' &&
    workload.spec.updateStrategy?.rollingUpdate?.partition === 0,
  volumeClaimPreserved:
    workload.spec.volumeClaimTemplates?.[0]?.metadata?.name === 'data' &&
    workload.spec.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage === '1Gi' &&
    workload.spec.volumeClaimTemplates?.[0]?.spec?.storageClassName === 'local-path',
  terminationPreserved: workload.spec.template.spec.terminationGracePeriodSeconds === 45,
  namespacePreserved:
    workload.metadata.namespace === namespace && service.metadata.namespace === namespace,
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
      serviceResult: serviceDryRun.stdout.trim(),
      serviceError: serviceDryRun.stderr.trim(),
      workloadResult: workloadDryRun.stdout.trim(),
      workloadError: workloadDryRun.stderr.trim(),
      residualResources,
      resourceSummary: {
        workload: {
          apiVersion: workload.apiVersion,
          kind: workload.kind,
          name: workload.metadata.name,
          serviceName: workload.spec.serviceName,
          updateStrategy: workload.spec.updateStrategy,
          terminationGracePeriodSeconds: workload.spec.template.spec.terminationGracePeriodSeconds,
          volumeClaimTemplates: workload.spec.volumeClaimTemplates,
        },
        service: {
          apiVersion: service.apiVersion,
          kind: service.kind,
          name: service.metadata.name,
          clusterIP: service.spec.clusterIP,
          selector: service.spec.selector,
          ports: service.spec.ports,
        },
      },
      checks,
    },
    null,
    2,
  ),
);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
