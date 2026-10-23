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
  execFileSync('kubectl', ['--context', context, 'version', '-o', 'json'], { encoding: 'utf8' }),
).serverVersion.gitVersion;
const resources = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
  const {buildDeployment,parseDeploymentSettings,buildDeploymentSettingsResource}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
  const resources=['Deployment','StatefulSet','DaemonSet'].map(kind=>{
    const original=buildDeployment({name:'v4-life-dryrun-'+kind.toLowerCase()+'-'+Date.now(),namespace:'v4-migration-e2e',replicas:1,
      containers:[{name:'web',image:'nginx:alpine'}],
      initContainers:[{name:'sidecar',image:'busybox',restartPolicy:'Always',lifecycle:{preStop:{type:'command',command:['sleep','1']}}}],
    });
    original.kind=kind;
    if(kind!=='Deployment') {delete original.spec.strategy;original.spec.updateStrategy={type:'RollingUpdate'};}
    if(kind==='DaemonSet') delete original.spec.replicas;
    if(kind==='StatefulSet') original.spec.serviceName=original.metadata.name;
    original.metadata.labels={'v4-migration-e2e':'lifecycle-dryrun'};
    const values=parseDeploymentSettings(original);
    values.containers[0].lifecycle={postStart:{type:'http',path:'/ready',port:8080,scheme:'HTTPS'},preStop:{type:'command',command:['printf','  a,b  ','']}};
    return buildDeploymentSettingsResource(original,values);
  });
  process.stdout.write(JSON.stringify(resources));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const results = [];
for (const resource of resources) {
  const result = spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    {
      input: JSON.stringify(resource),
      encoding: 'utf8',
      timeout: 30000,
    },
  );
  results.push({
    kind: resource.kind,
    expected: 'accepted',
    passed: result.status === 0,
    result: result.stdout.trim(),
    error: result.stderr.trim(),
  });
}
const invalid = JSON.parse(JSON.stringify(resources[0]));
delete invalid.spec.template.spec.initContainers[0].restartPolicy;
const rejected = spawnSync(
  'kubectl',
  ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
  {
    input: JSON.stringify(invalid),
    encoding: 'utf8',
    timeout: 30000,
  },
);
results.push({
  kind: 'Deployment/普通 init 生命周期',
  expected: 'rejected',
  passed: rejected.status !== 0 && /lifecycle.*restartPolicy=Always/s.test(rejected.stderr),
  error: rejected.stderr.trim(),
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
      results,
    },
    null,
    2,
  ),
);
if (results.some(result => !result.passed)) process.exitCode = 1;
