// 仅验证 131 专用测试 namespace 的三类 Workload 顶层元数据 API 校验，不保存资源。
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const context = 'default';
const namespace = 'v4-migration-e2e';
const labelSelector = 'v4-migration-e2e=existing-top-metadata-dryrun';
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
const resources=['Deployment','StatefulSet','DaemonSet'].map(kind=>{
  const name='v4-existing-top-'+kind.toLowerCase()+'-'+stamp;
  const original=buildDeployment({
    name,
    namespace:'${namespace}',
    replicas:1,
    workloadLabels:{'v4-migration-e2e':'existing-top-metadata-dryrun','example.com/editable':'before'},
    workloadAnnotations:{'kubesphere.io/creator':'admin','example.com/editable':'before'},
    podAnnotations:{'example.com/template':'kept'},
    containers:[{name:'web',image:'nginx:alpine'}],
  });
  original.kind=kind;
  if(kind!=='Deployment'){
    delete original.spec.strategy;
    original.spec.updateStrategy={type:'RollingUpdate'};
  }
  if(kind==='DaemonSet')delete original.spec.replicas;
  if(kind==='StatefulSet')original.spec.serviceName=name;
  const selector=JSON.parse(JSON.stringify(original.spec.selector));
  const templateMetadata=JSON.parse(JSON.stringify(original.spec.template.metadata));
  const values=parseDeploymentSettings(original);
  values.workloadLabels={...values.workloadLabels,'example.com/editable':'after','example.com/empty':''};
  values.workloadAnnotations={...values.workloadAnnotations,'example.com/editable':'after','example.com/empty':''};
  return {resource:buildDeploymentSettingsResource(original,values),selector,templateMetadata};
});
process.stdout.write(JSON.stringify(resources));
`,
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);

const results = resources.map(({ resource, selector, templateMetadata }) => {
  const dryRun = spawnSync(
    'kubectl',
    ['--context', context, 'create', '--dry-run=server', '-f', '-', '-o', 'name'],
    { input: JSON.stringify(resource), encoding: 'utf8', timeout: 30000 },
  );
  const labels = resource.metadata.labels || {};
  const annotations = resource.metadata.annotations || {};
  return {
    kind: resource.kind,
    expected: 'accepted',
    passed: dryRun.status === 0,
    result: dryRun.stdout.trim(),
    error: dryRun.stderr.trim(),
    checks: {
      systemAppLabelPreserved: labels.app === resource.metadata.name,
      editableLabelUpdated: labels['example.com/editable'] === 'after',
      emptyLabelAccepted: labels['example.com/empty'] === '',
      creatorAnnotationPreserved: annotations['kubesphere.io/creator'] === 'admin',
      editableAnnotationUpdated: annotations['example.com/editable'] === 'after',
      emptyAnnotationAccepted: annotations['example.com/empty'] === '',
      selectorUnchanged: JSON.stringify(resource.spec.selector) === JSON.stringify(selector),
      podTemplateMetadataUnchanged:
        JSON.stringify(resource.spec.template.metadata) === JSON.stringify(templateMetadata),
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
) {
  process.exitCode = 1;
}
