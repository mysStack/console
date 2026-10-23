// 仅验证 131 专用测试 namespace 的 API 校验，不保存任何资源。
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
  const resources=['Deployment','StatefulSet','DaemonSet'].map(kind=>{
    const original=buildDeployment({name:'v4-security-dryrun-'+kind.toLowerCase()+'-'+Date.now(),namespace:'v4-migration-e2e',replicas:1,containers:[{name:'web',image:'nginx:alpine'}]});
    original.kind=kind;
    if(kind!=='Deployment'){delete original.spec.strategy;original.spec.updateStrategy={type:'RollingUpdate'};}
    if(kind==='DaemonSet')delete original.spec.replicas;
    if(kind==='StatefulSet')original.spec.serviceName=original.metadata.name;
    original.metadata.labels={'v4-migration-e2e':'security-dryrun'};
    const values=parseDeploymentSettings(original);
    values.podSecurityContext={runAsNonRoot:true,runAsUser:1000,runAsGroup:1000,seLinuxOptions:{type:'container_t',level:'s0'}};
    values.containers[0].securityContext={allowPrivilegeEscalation:false,readOnlyRootFilesystem:true,runAsNonRoot:true,runAsUser:1000,capabilities:{add:['NET_BIND_SERVICE'],drop:['ALL']}};
    return buildDeploymentSettingsResource(original,values);
  });
  process.stdout.write(JSON.stringify(resources));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const results = resources.map(resource => {
  const result = spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    {
      input: JSON.stringify(resource),
      encoding: 'utf8',
      timeout: 30000,
    },
  );
  return {
    kind: resource.kind,
    expected: 'accepted',
    passed: result.status === 0,
    result: result.stdout.trim(),
    error: result.stderr.trim(),
  };
});
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const changes = execFileSync(
  'git',
  [
    'diff',
    '--name-only',
    '--',
    'packages/console/src/pages/projects/components/WorkloadCreateModal',
  ],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
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
    'v4-migration-e2e=security-dryrun',
    '-o',
    'name',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
console.log(
  JSON.stringify(
    {
      date: new Date().toISOString(),
      sourceCommit: sha,
      uncommittedSourceFiles: changes,
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
if (results.some(result => !result.passed)) process.exitCode = 1;
