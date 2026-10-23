// 验证 131 专用 namespace 的三类 Workload 宿主时区请求，不保存任何资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const selector = 'v4-migration-e2e=timezone-dryrun';
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
const resources = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
const {buildDeployment,parseDeploymentSettings,buildDeploymentSettingsResource}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const stamp=Date.now();
const timezoneMount={name:'host-time',mountPath:'/etc/localtime',readOnly:true};
const create=(kind,index)=>{
  const name='v4-timezone-dryrun-'+kind.toLowerCase()+'-'+stamp;
  const base=buildDeployment({
    name,namespace:'${namespace}',replicas:1,
    containers:[{name:'web',image:'nginx:alpine',volumeMounts:index!==1?[timezoneMount]:[]}],
    initContainers:index===1?[{name:'init',image:'busybox:stable',volumeMounts:[timezoneMount]}]:[],
  });
  base.kind=kind;
  base.metadata.labels={'v4-migration-e2e':'timezone-dryrun',app:name};
  base.spec.selector.matchLabels=base.metadata.labels;
  base.spec.template.metadata.labels=base.metadata.labels;
  if(kind!=='Deployment'){
    delete base.spec.strategy;
    base.spec.updateStrategy={type:'RollingUpdate'};
  }
  if(kind==='StatefulSet')base.spec.serviceName=name;
  if(kind==='DaemonSet')delete base.spec.replicas;
  return index===2?buildDeploymentSettingsResource(base,parseDeploymentSettings(base)):base;
};
process.stdout.write(JSON.stringify(['Deployment','StatefulSet','DaemonSet'].map(create)));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

const results = resources.map(resource => {
  const dryRun = spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
  );
  const podSpec = resource.spec.template.spec;
  const allContainers = [...(podSpec.containers || []), ...(podSpec.initContainers || [])];
  return {
    kind: resource.kind,
    expected: 'accepted',
    passed: dryRun.status === 0,
    result: dryRun.stdout.trim(),
    error: dryRun.stderr.trim(),
    checks: {
      hostTimeVolume:
        podSpec.volumes?.filter(
          volume => volume.name === 'host-time' && volume.hostPath?.path === '/etc/localtime',
        ).length === 1,
      readOnlyMount: allContainers.some(container =>
        (container.volumeMounts || []).some(
          mount =>
            mount.name === 'host-time' &&
            mount.mountPath === '/etc/localtime' &&
            mount.readOnly === true,
        ),
      ),
    },
  };
});
const residualResources = execFileSync(
  'kubectl',
  [
    '--context',
    context,
    '-n',
    namespace,
    'get',
    'deployments,statefulsets,daemonsets',
    '-l',
    selector,
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
      namespace,
      mode: 'server dry-run; no resource persisted',
      residualResources,
      results,
    },
    null,
    2,
  ),
);
if (
  results.some(result => !result.passed || Object.values(result.checks).some(value => !value)) ||
  residualResources.length
)
  process.exitCode = 1;
