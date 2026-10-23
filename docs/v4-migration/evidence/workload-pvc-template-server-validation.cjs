// 在 131 上验证 StatefulSet PVC 模板请求，只使用 server dry-run，不保存资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const kubectl = args =>
  execFileSync('kubectl', ['--context', context, ...args], { encoding: 'utf8' });
const server = kubectl([
  'config',
  'view',
  '--minify',
  '-o',
  'jsonpath={.clusters[0].cluster.server}',
]).trim();
if (server !== 'https://192.168.2.131:6443') throw new Error('目标集群不是已授权的 131');

const resource = JSON.parse(
  execFileSync(
    path.join(root, 'node_modules/.bin/esno'),
    [
      '-e',
      `
const {buildDeployment,parseDeploymentSettings,buildDeploymentSettingsResource}=require('./packages/console/src/pages/projects/components/WorkloadCreateModal/deployment');
const name='v4-pvc-template-dryrun-'+Date.now();
const base=buildDeployment({name,namespace:'${namespace}',replicas:1,containers:[{name:'web',image:'nginx:alpine',volumeMounts:[{name:'data',mountPath:'/data'}]}]});
base.kind='StatefulSet';
delete base.spec.strategy;
base.spec.serviceName=name;
base.spec.updateStrategy={type:'RollingUpdate',rollingUpdate:{partition:0}};
base.spec.volumeClaimTemplates=[{metadata:{name:'data',labels:{'example.com/keep':'yes'}},spec:{accessModes:['ReadWriteOnce'],storageClassName:'fast.csi.example.com',volumeMode:'Filesystem',resources:{requests:{storage:'1Gi','example.com/keep':'1'}}}}];
const values=parseDeploymentSettings(base);
values.volumeClaimTemplates[0]={name:'data',accessModes:['ReadWriteMany'],storageClassName:'slow.csi.example.com',storage:'2Gi'};
process.stdout.write(JSON.stringify(buildDeploymentSettingsResource(base,values)));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

const dryRun = spawnSync(
  'kubectl',
  ['--context', context, '-n', namespace, 'create', '--dry-run=server', '-f', '-', '-o', 'json'],
  { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
);
const output = dryRun.stdout ? JSON.parse(dryRun.stdout) : undefined;
const template = resource.spec.volumeClaimTemplates?.[0];
const result = {
  date: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  server,
  namespace,
  mode: 'StatefulSet create server dry-run; no resource persisted',
  resource: `${resource.kind}/${resource.metadata.name}`,
  accepted: dryRun.status === 0,
  error: dryRun.stderr.trim(),
  responseKind: output?.kind,
  serviceName: resource.spec.serviceName,
  template: {
    name: template?.metadata?.name,
    accessModes: template?.spec?.accessModes,
    storageClassName: template?.spec?.storageClassName,
    storage: template?.spec?.resources?.requests?.storage,
    preservedLabel: template?.metadata?.labels?.['example.com/keep'],
    preservedVolumeMode: template?.spec?.volumeMode,
    preservedRequest: template?.spec?.resources?.requests?.['example.com/keep'],
  },
  checks: {
    statefulSetAccepted: output?.kind === 'StatefulSet',
    editedAccessMode: template?.spec?.accessModes?.[0] === 'ReadWriteMany',
    editedStorage: template?.spec?.resources?.requests?.storage === '2Gi',
    preservedMetadata: template?.metadata?.labels?.['example.com/keep'] === 'yes',
    preservedSpec: template?.spec?.volumeMode === 'Filesystem',
    preservedRequest: template?.spec?.resources?.requests?.['example.com/keep'] === '1',
  },
};
console.log(JSON.stringify(result, null, 2));
if (!result.accepted || Object.values(result.checks).some(value => !value)) process.exitCode = 1;
