// 仅验证 131 专用测试 namespace 的调度字段 API 校验，不保存任何资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
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
const {buildDeployment,parseDeploymentSettings,buildDeploymentSettingsResource}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const stamp=Date.now();
const base=(kind,name)=>{
  const resource=buildDeployment({name,namespace:'v4-migration-e2e',replicas:1,containers:[{name:'web',image:'nginx:alpine'}]});
  resource.kind=kind;
  resource.metadata.labels={'v4-migration-e2e':'scheduling-dryrun'};
  if(kind!=='Deployment'){delete resource.spec.strategy;resource.spec.updateStrategy={type:'RollingUpdate'};}
  if(kind==='DaemonSet')delete resource.spec.replicas;
  if(kind==='StatefulSet')resource.spec.serviceName=name;
  return resource;
};
const deployment=buildDeployment({
  name:'v4-scheduling-dryrun-deployment-'+stamp,
  namespace:'v4-migration-e2e',
  replicas:1,
  podScheduling:{mode:'decentralized'},
  nodeSelector:{'kubernetes.io/os':'linux'},
  containers:[{name:'web',image:'nginx:alpine'}],
});
deployment.metadata.labels={'v4-migration-e2e':'scheduling-dryrun'};
const statefulSet=base('StatefulSet','v4-scheduling-dryrun-statefulset-'+stamp);
const statefulValues=parseDeploymentSettings(statefulSet);
statefulValues.podScheduling={
  mode:'custom',
  rules:[
    {policy:'podAffinity',type:'requiredDuringSchedulingIgnoredDuringExecution',target:'api'},
    {policy:'podAntiAffinity',type:'preferredDuringSchedulingIgnoredDuringExecution',target:'worker'},
  ],
};
const daemonSet=base('DaemonSet','v4-scheduling-dryrun-daemonset-'+stamp);
daemonSet.spec.template.spec.affinity={
  nodeAffinity:{
    requiredDuringSchedulingIgnoredDuringExecution:{
      nodeSelectorTerms:[{matchExpressions:[{key:'kubernetes.io/os',operator:'In',values:['linux']}]}],
    },
  },
};
const daemonValues=parseDeploymentSettings(daemonSet);
daemonValues.terminationGracePeriodSeconds=15;
process.stdout.write(JSON.stringify([
  deployment,
  buildDeploymentSettingsResource(statefulSet,statefulValues),
  buildDeploymentSettingsResource(daemonSet,daemonValues),
]));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

const results = resources.map(resource => {
  const result = spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
  );
  return {
    kind: resource.kind,
    expected: 'accepted',
    passed: result.status === 0,
    result: result.stdout.trim(),
    error: result.stderr.trim(),
    affinityPolicies: Object.keys(resource.spec.template.spec.affinity || {}),
    nodeSelector: resource.spec.template.spec.nodeSelector || null,
  };
});
const residualResources = execFileSync(
  'kubectl',
  [
    '--context',
    context,
    '-n',
    'v4-migration-e2e',
    'get',
    'deployments,statefulsets,daemonsets',
    '-l',
    'v4-migration-e2e=scheduling-dryrun',
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
      namespace: 'v4-migration-e2e',
      mode: 'server dry-run; no resource persisted',
      residualResources,
      results,
    },
    null,
    2,
  ),
);
if (results.some(result => !result.passed) || residualResources.length) process.exitCode = 1;
