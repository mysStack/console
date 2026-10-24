// 验证 StatefulSet Headless Service PATCH 的服务端边界，只使用 dry-run，不保存资源。
const { execFileSync } = require('node:child_process');

const context = 'default';
const namespace = 'v4-migration-e2e';
const name = 'v4-watch-sts-20261022-01';
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

const before = JSON.parse(kubectl(['-n', namespace, 'get', 'service', name, '-o', 'json']));
const ports = (before.spec?.ports || []).map(port => ({
  ...port,
  targetPort: typeof port.targetPort === 'number' ? port.targetPort + 1 : port.targetPort,
}));
const patch = {
  metadata: { resourceVersion: before.metadata.resourceVersion },
  spec: { clusterIP: before.spec.clusterIP, ports },
};
const dryRun = JSON.parse(
  execFileSync(
    'kubectl',
    [
      '--context',
      context,
      '-n',
      namespace,
      'patch',
      'service',
      name,
      '--type=merge',
      '--patch',
      JSON.stringify(patch),
      '--dry-run=server',
      '-o',
      'json',
    ],
    { encoding: 'utf8' },
  ),
);
const after = JSON.parse(kubectl(['-n', namespace, 'get', 'service', name, '-o', 'json']));
const result = {
  date: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  server,
  namespace,
  resource: `service/${name}`,
  mode: 'merge PATCH server dry-run; no resource persisted',
  beforeResourceVersion: before.metadata.resourceVersion,
  dryRunResourceVersion: dryRun.metadata.resourceVersion,
  afterResourceVersion: after.metadata.resourceVersion,
  beforeClusterIP: before.spec.clusterIP,
  dryRunClusterIP: dryRun.spec.clusterIP,
  requestedPorts: ports,
  dryRunPorts: dryRun.spec.ports,
  checks: {
    headlessPreserved: dryRun.spec.clusterIP === 'None',
    portPatchAccepted: JSON.stringify(dryRun.spec.ports) === JSON.stringify(ports),
    unchangedAfter: before.metadata.resourceVersion === after.metadata.resourceVersion,
  },
};
console.log(JSON.stringify(result, null, 2));
if (Object.values(result.checks).some(value => !value)) process.exitCode = 1;
