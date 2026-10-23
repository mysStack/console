// 对 131 专用测试 DaemonSet 执行 server dry-run 补丁，并确认资源未变化。
const { execFileSync } = require('node:child_process');
const context = 'default';
const namespace = 'v4-migration-e2e';
const name = 'v4-watch-ds-20261022-01';
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
const before = JSON.parse(kubectl(['-n', namespace, 'get', 'daemonset', name, '-o', 'json']));
const dryRun = JSON.parse(
  kubectl([
    '-n',
    namespace,
    'patch',
    'daemonset',
    name,
    '--type=merge',
    '--patch',
    '{"spec":{"template":{"spec":{"nodeSelector":{"non-existing":"true"}}}}}',
    '--dry-run=server',
    '-o',
    'json',
  ]),
);
const after = JSON.parse(kubectl(['-n', namespace, 'get', 'daemonset', name, '-o', 'json']));
const selector = value => value.spec.template.spec.nodeSelector || null;
const result = {
  date: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  server,
  namespace,
  resource: `daemonset/${name}`,
  mode: 'merge patch server dry-run; no resource persisted',
  beforeResourceVersion: before.metadata.resourceVersion,
  dryRunResourceVersion: dryRun.metadata.resourceVersion,
  afterResourceVersion: after.metadata.resourceVersion,
  beforeNodeSelector: selector(before),
  dryRunNodeSelector: selector(dryRun),
  afterNodeSelector: selector(after),
  patchAccepted: selector(dryRun)?.['non-existing'] === 'true',
  unchangedAfter:
    before.metadata.resourceVersion === after.metadata.resourceVersion &&
    JSON.stringify(selector(before)) === JSON.stringify(selector(after)),
};
console.log(JSON.stringify(result, null, 2));
if (!result.patchAccepted || !result.unchangedAfter) process.exitCode = 1;
