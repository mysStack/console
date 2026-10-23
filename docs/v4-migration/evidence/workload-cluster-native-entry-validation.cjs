// 校验精确提交的集群级三类 Workload 主路由已切换到原生列表与创建入口。
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const read = relativePath => readFileSync(path.join(root, relativePath), 'utf8');
const routePath = 'packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx';
const listPath =
  'packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/index.tsx';
const modalPath = 'packages/console/src/pages/projects/components/WorkloadCreateModal/index.tsx';
const resourceOptionsPath =
  'packages/console/src/pages/projects/components/WorkloadCreateModal/useWorkloadResourceOptions.ts';
const targetOptionsPath =
  'packages/console/src/pages/projects/components/WorkloadCreateModal/useWorkloadTargetOptions.ts';
const routes = read(routePath);
const list = read(listPath);
const modal = read(modalPath);
const resourceOptions = read(resourceOptionsPath);
const targetOptions = read(targetOptionsPath);
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
    routePath,
    listPath,
    modalPath,
    resourceOptionsPath,
    targetOptionsPath,
  ],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

const nativeRoute = module =>
  routes.includes(`path: \`\${PATH}/${module}\``) &&
  routes.includes(`element: <Workloads module="${module}" />`);
const checks = {
  deploymentRouteNative: nativeRoute('deployments'),
  statefulSetRouteNative: nativeRoute('statefulsets'),
  daemonSetRouteNative: nativeRoute('daemonsets'),
  workloadRouteHasNoV3List:
    !routes.includes('WorkLoadList') && !routes.includes('../Workload/Workloads'),
  nativeListHasNamespaceSelector: list.includes('hasNamespaceSelector'),
  nativeListHasCreateModal: list.includes('<WorkloadCreateModal'),
  deploymentAndDaemonSetCreate: list.includes('useCreateWorkloadMutation'),
  statefulSetCreate: list.includes('useCreateStatefulSetMutation'),
  createUsesPayloadNamespace:
    list.includes("module === 'statefulsets'") &&
    list.includes('data.workload?.metadata?.namespace') &&
    list.includes('data.metadata?.namespace'),
  namespaceSelectable:
    modal.includes('namespaceSelectable?: boolean') && modal.includes('<NamespaceSelector'),
  namespaceDependencyReload:
    modal.includes("useWatch('namespace', form)") &&
    modal.includes('useWorkloadResourceOptions(cluster, watchedNamespace)') &&
    modal.includes('useWorkloadTargetOptions(kind, cluster, watchedNamespace)'),
  emptyNamespaceDoesNotFetch:
    resourceOptions.includes('if (!namespace)') && targetOptions.includes('|| !namespace'),
  statusReasonIsRendered: list.includes('<StatusReason') && !list.includes('<span>reason</span>'),
  exactCommittedSource: uncommittedSourceFiles.length === 0,
};

console.log(
  JSON.stringify(
    {
      date: new Date().toISOString(),
      sourceCommit,
      uncommittedSourceFiles,
      scope: 'cluster deployments/statefulsets/daemonsets routes and native create wiring',
      files: [routePath, listPath, modalPath, resourceOptionsPath, targetOptionsPath],
      checks,
      limits: [
        'static source validation only',
        'no image build or deployment identity validation',
        'no browser rendering, RBAC, namespace isolation, persistence, cache or V3 equivalence validation',
      ],
    },
    null,
    2,
  ),
);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
