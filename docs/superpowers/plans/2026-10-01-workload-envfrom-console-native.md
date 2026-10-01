# 标准工作负载原生 envFrom 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Console 原生创建和编辑 Deployment、StatefulSet、DaemonSet 时，安全地配置 Kubernetes ConfigMap/Secret `envFrom` 引用。

**Architecture:** 创建一个不依赖 V3 的工作负载表单域：纯 `envFrom` 转换模块负责 Kubernetes 数据契约，资源选择器负责加载当前项目内的 ConfigMap/Secret，控制器适配器负责写入三种资源共同的 `spec.template.spec.containers`。三个控制器共享容器环境变量组件，但各自保留最小的控制器特有字段；现有 V3 路由不删除，作为回滚入口。

**Tech Stack:** React 17、TypeScript、React Router v6、React Query、`@kubed/components`、`@ks-console/shared`、Kubernetes `apps/v1`。

**Spec:** `docs/designs/2026-10-01-workload-envfrom-console-native-design.md`

## Global Constraints

- 基线分支是 `release-4.1.5`；所有本期代码只位于 `console/feature/workload-envfrom-console`。
- 只迁移 Deployment、StatefulSet、DaemonSet 的创建和编辑；不迁移 Job、CronJob、文件挂载或 Helm values 表单。
- 不修改 ks-apiserver、ks-controller-manager 或 Kubernetes CRD；复用 `workloadStore(module).usePostMutation` 与 `usePutMutation`。
- 不 import `kse-console-v3` 源码、不修改 V3 制品，也不通过 Wujie 传递表单状态。
- Secret 的值、Base64 内容和 Key 值不得出现在 UI、日志、错误信息或测试快照中；选择器只使用资源名称。
- `env` 和 `envFrom` 必须可以共存；相同容器中同类型同名称的 `envFrom` 引用必须被拒绝。
- 所有提交信息使用中文；不提交 `.playwright-cli/` 或既有未跟踪的 `docs/superpowers/` 历史文件。

---

## 文件结构

```text
packages/console/src/pages/projects/components/WorkloadForm/
├── envFrom.ts                         # UI 行与 Kubernetes envFrom 的纯转换
├── envFrom.test.ts                    # 转换、校验和空项清理
├── EnvFromReferenceList.tsx           # ConfigMap/Secret 引用编辑器
├── EnvFromReferenceList.test.tsx      # 加载、错误、重复和脱敏展示
├── workloadTemplate.ts                # 三种 workload 的 PodTemplate 读写适配
├── workloadTemplate.test.ts           # controller 特有字段不被 envFrom 覆盖
├── WorkloadForm.tsx                   # 共用容器、env/envFrom、控制器字段表单
└── types.ts                           # FormModel、EnvFromReference、WorkloadKind

packages/console/src/pages/projects/containers/Workloads/
├── Create/index.tsx                   # 根据 kind 创建原生工作负载
├── Edit/index.tsx                     # 读取、回显并更新原生工作负载
└── routes.tsx                         # new/:kind 和 :kind/:name/edit 路由

packages/console/src/pages/projects/routes/index.tsx
packages/console/src/pages/projects/routes/detail.tsx
packages/console/src/pages/projects/containers/{Deployments,StatefulSets,DaemonSets}/index.tsx
```

### Task 1: 纯 `envFrom` 领域模型

**Files:**

- Create: `packages/console/src/pages/projects/components/WorkloadForm/types.ts`
- Create: `packages/console/src/pages/projects/components/WorkloadForm/envFrom.ts`
- Test: `packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts`

**Interfaces:**

- Produces `EnvFromReference = { type: 'configMap' | 'secret'; name: string; prefix: string }`。
- Produces `parseEnvFrom(items)`, `serializeEnvFrom(rows)`, `findDuplicateEnvFrom(rows)` 和 `removeIncompleteEnvFrom(rows)`。
- `serializeEnvFrom` 返回 Kubernetes `EnvFromSource[]`，而不是 V3 的组件状态。

- [ ] **Step 1: 写失败测试，定义 ConfigMap、Secret、前缀、重复和空行行为。**

```ts
expect(serializeEnvFrom([{ type: 'configMap', name: 'app-config', prefix: 'APP_' }])).toEqual([
  { configMapRef: { name: 'app-config' }, prefix: 'APP_' },
]);
expect(serializeEnvFrom([{ type: 'secret', name: 'app-secret', prefix: '' }])).toEqual([
  { secretRef: { name: 'app-secret' } },
]);
expect(
  findDuplicateEnvFrom([
    { type: 'configMap', name: 'app-config', prefix: '' },
    { type: 'configMap', name: 'app-config', prefix: 'OTHER_' },
  ]),
).toEqual([{ index: 1, name: 'app-config', type: 'configMap' }]);
```

- [ ] **Step 2: 运行测试并确认当前失败。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts --runInBand`

Expected: FAIL，因为转换模块尚不存在。

- [ ] **Step 3: 实现只读写引用名称的纯函数。**

```ts
export function serializeEnvFrom(rows: EnvFromReference[]) {
  return removeIncompleteEnvFrom(rows).map(({ type, name, prefix }) => ({
    ...(type === 'configMap' ? { configMapRef: { name } } : { secretRef: { name } }),
    ...(prefix ? { prefix } : {}),
  }));
}
```

- [ ] **Step 4: 重跑测试并提交。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts --runInBand`

Expected: PASS。

Commit: `前端: 增加原生工作负载 envFrom 数据模型`

### Task 2: Pod Template 和三种控制器适配器

**Files:**

- Create: `packages/console/src/pages/projects/components/WorkloadForm/workloadTemplate.ts`
- Test: `packages/console/src/pages/projects/components/WorkloadForm/workloadTemplate.test.ts`
- Modify: `packages/shared/src/stores/workload/index.ts`

**Interfaces:**

- Consumes Task 1 的 `parseEnvFrom`、`serializeEnvFrom`。
- Produces `toWorkloadForm(resource, kind)`, `toWorkloadManifest(form, kind)`。
- Produces `workloadStore(module).usePostMutation` 的可用创建调用；不改变既有删除、停止、回滚接口。

- [ ] **Step 1: 写失败测试，验证三种资源共同写入 Pod Template，且各自特有字段不丢失。**

```ts
const manifest = toWorkloadManifest(
  {
    name: 'demo',
    image: 'nginx:1.27',
    env: [],
    envFrom: [{ type: 'secret', name: 'db-credentials', prefix: '' }],
    serviceName: 'demo-headless',
  },
  'statefulsets',
);

expect(manifest.spec.template.spec.containers[0].envFrom).toEqual([
  { secretRef: { name: 'db-credentials' } },
]);
expect(manifest.spec.serviceName).toBe('demo-headless');
```

- [ ] **Step 2: 运行测试并确认失败。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/workloadTemplate.test.ts --runInBand`

Expected: FAIL，因为适配器尚不存在。

- [ ] **Step 3: 实现最小资源模板和创建 Mutation。**

```ts
const store = workloadStore(module);
const { mutate: createWorkload } = store.usePostMutation({ cluster, namespace });
createWorkload({ data: toWorkloadManifest(values, module) });
```

- [ ] **Step 4: 重跑测试并提交。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/workloadTemplate.test.ts --runInBand`

Expected: PASS。

Commit: `前端: 增加标准工作负载表单适配器`

### Task 3: ConfigMap/Secret 原生引用选择器

**Files:**

- Create: `packages/console/src/pages/projects/components/WorkloadForm/EnvFromReferenceList.tsx`
- Test: `packages/console/src/pages/projects/components/WorkloadForm/EnvFromReferenceList.test.tsx`
- Modify: `packages/shared/src/stores/secret.ts`

**Interfaces:**

- Consumes `configMapStore.fetchListByK8s({ cluster, namespace })`。
- Consumes一个不会解码 Secret `data` 的 Secret 名称列表接口。
- Consumes Task 1 的 `EnvFromReference[]`。
- Produces `onChange(rows: EnvFromReference[])`。

- [ ] **Step 1: 写失败组件测试，覆盖加载、错误、资源选择、前缀、删除和重复提示。**

```tsx
render(<EnvFromReferenceList cluster="host" namespace="demo" value={[]} onChange={onChange} />);
await user.selectOptions(screen.getByLabelText('引用类型'), 'secret');
await user.selectOptions(screen.getByLabelText('引用资源'), 'db-credentials');
expect(onChange).toHaveBeenCalledWith([{ type: 'secret', name: 'db-credentials', prefix: '' }]);
expect(screen.queryByText('encoded-secret-value')).not.toBeInTheDocument();
```

- [ ] **Step 2: 运行测试并确认失败。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/EnvFromReferenceList.test.tsx --runInBand`

Expected: FAIL，因为选择器尚不存在。

- [ ] **Step 3: 实现选择器和脱敏 Secret 列表调用。**

```ts
const [configMaps, secrets] = await Promise.all([
  configMapStore.fetchListByK8s({ cluster, namespace }),
  secretStore.fetchListByK8s({ cluster, namespace }),
]);
const secretOptions = secrets.map(({ name }: { name: string }) => ({ label: name, value: name }));
```

不要调用 `secretStore.mapper` 或读取 `secret.data`；如现有 `fetchListByK8s` 必然执行 mapper，则在 `secretStore` 增加只返回 `metadata.name` 的列表方法。

- [ ] **Step 4: 重跑测试并提交。**

Run: `corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/EnvFromReferenceList.test.tsx --runInBand`

Expected: PASS。

Commit: `前端: 增加工作负载配置引用选择器`

### Task 4: 原生创建和编辑页面

**Files:**

- Create: `packages/console/src/pages/projects/components/WorkloadForm/WorkloadForm.tsx`
- Create: `packages/console/src/pages/projects/containers/Workloads/Create/index.tsx`
- Create: `packages/console/src/pages/projects/containers/Workloads/Edit/index.tsx`
- Create: `packages/console/src/pages/projects/containers/Workloads/routes.tsx`
- Modify: `packages/console/src/pages/projects/routes/index.tsx`
- Modify: `packages/console/src/pages/projects/routes/detail.tsx`

**Interfaces:**

- Consumes Task 2 的 `toWorkloadForm`, `toWorkloadManifest`。
- Consumes Task 3 的 `EnvFromReferenceList`。
- Produces以下路由：`deployments/new`、`statefulsets/new`、`daemonsets/new`，以及对应的 `:name/edit`。
- Uses `workloadStore(kind).usePostMutation` 创建，`usePutMutation` 读取 resourceVersion 后更新。

- [ ] **Step 1: 写路由和表单测试，先验证页面不会创建 Wujie 容器。**

```tsx
renderProjectRoute('/dev/clusters/host/projects/demo/deployments/new');
expect(screen.getByRole('heading', { name: '创建 Deployment' })).toBeInTheDocument();
expect(document.querySelector('wujie-app')).toBeNull();
```

- [ ] **Step 2: 运行测试并确认失败。**

Run: `corepack yarn jest packages/console/src/pages/projects/containers/Workloads --runInBand`

Expected: FAIL，因为原生路由和页面尚不存在。

- [ ] **Step 3: 实现共用表单和三种轻量适配。**

```tsx
<WorkloadForm
  kind={kind}
  initialValue={formValue}
  onSubmit={values => mutate({ data: toWorkloadManifest(values, kind) })}
/>
```

创建页只收集名称、镜像、容器端口、普通 `env` 和 `envFrom`，以及必要控制器字段；编辑页先读取当前资源、回显 `env`/`envFrom`，PUT 前保留读取到的 `metadata.resourceVersion`。不在本期复制 V3 的存储、探针、亲和性等高级向导字段。

- [ ] **Step 4: 重跑路由和表单测试并提交。**

Run: `corepack yarn jest packages/console/src/pages/projects/containers/Workloads --runInBand`

Expected: PASS。

Commit: `前端: 增加原生标准工作负载配置引用表单`

### Task 5: 从现有列表进入原生表单并保留回退

**Files:**

- Modify: `packages/console/src/pages/projects/containers/Deployments/index.tsx`
- Modify: `packages/console/src/pages/projects/containers/StatefulSets/index.tsx`
- Modify: `packages/console/src/pages/projects/containers/DaemonSets/index.tsx`
- Modify: `packages/console/src/pages/projects/containers/Workloads/routes.tsx`
- Test: `packages/console/src/pages/projects/containers/Workloads/routes.test.tsx`

**Interfaces:**

- Consumes Task 4 的创建和编辑路由。
- Produces明确入口：创建/编辑操作进入原生路由；未迁移列表和详情仍保持当前 V3 路径。
- Produces一个可切换的 `useNativeWorkloadForm` 路由开关，关闭时恢复原始 Wujie 创建/编辑入口。

- [ ] **Step 1: 写失败测试，验证开关开启时创建入口是 Console 路由，关闭时保留 V3 URL。**

```ts
expect(getWorkloadCreateUrl('deployments', params, true)).toBe(
  '/dev/clusters/host/projects/demo/deployments/new',
);
expect(getWorkloadCreateUrl('deployments', params, false)).toContain('/consolev3/');
```

- [ ] **Step 2: 运行测试并确认失败。**

Run: `corepack yarn jest packages/console/src/pages/projects/containers/Workloads/routes.test.tsx --runInBand`

Expected: FAIL，因为路由辅助函数尚不存在。

- [ ] **Step 3: 实现最小路由切换和返回行为。**

```ts
export const getWorkloadCreateUrl = (kind, { workspace, cluster, namespace }, native) =>
  native
    ? `/${workspace}/clusters/${cluster}/projects/${namespace}/${kind}/new`
    : `${getConsoleV3ProjectUrl(workspace, cluster, namespace)}/${kind}`;
```

默认启用原生创建/编辑入口；若测试环境出现阻断问题，可通过单一布尔配置恢复 V3，不修改已创建资源。

- [ ] **Step 4: 重跑测试并提交。**

Run: `corepack yarn jest packages/console/src/pages/projects/containers/Workloads/routes.test.tsx --runInBand`

Expected: PASS。

Commit: `前端: 切换标准工作负载原生表单入口`

### Task 6: 端到端验证、文档收尾和发布准备

**Files:**

- Modify: `docs/designs/2026-10-01-workload-envfrom-console-native-design.md`
- Modify: `docs/v3dist-integration.md`（若此分支引入该文档，则补充 V3 仅兼容旧页面的边界；若未引入，不创建重复文档）
- Modify: `../kubesphere/docs/PLAN.md`（仅在单独文档提交中更新路线状态，不在本前端功能提交中创建空后端分支）

**Interfaces:**

- Consumes前三种资源的创建和编辑界面。
- Produces部署验证记录、回滚开关说明和明确的 P1 文件挂载待办。

- [ ] **Step 1: 运行完整前端检查。**

Run:

```bash
corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm packages/console/src/pages/projects/containers/Workloads --runInBand
corepack yarn lint:format
corepack yarn build:prod
```

Expected: 所有新增测试通过，格式检查通过，生产构建成功。

- [ ] **Step 2: 部署测试镜像并在测试项目验证三种资源。**

For each kind (`deployments`, `statefulsets`, `daemonsets`):

```bash
kubectl -n <test-namespace> get <kind> <name> -o jsonpath='{.spec.template.spec.containers[0].envFrom}'
kubectl -n <test-namespace> exec <pod-name> -- printenv | rg '^(APP_|SECRET_)'
```

使用测试 ConfigMap 与测试 Secret；命令输出只校验变量名和非空状态，不记录 Secret 值。

- [ ] **Step 3: 浏览器验证与回滚验证。**

在 1280、1440、1920 CSS 宽度执行创建和编辑；确认下拉可选、错误状态可见、布局无重叠。关闭 `useNativeWorkloadForm` 后确认入口回到 V3，已创建工作负载不受影响。

- [ ] **Step 4: 更新验收记录并提交。**

Commit: `文档: 记录标准工作负载配置引用验收`

## 计划自检

- 纯数据模型、共享组件、控制器适配、路由、回滚、浏览器验证和集群验证均有独立任务。
- 所有 `envFrom` 写入都限定在 Pod Template，且覆盖 Deployment、StatefulSet、DaemonSet。
- 文件挂载、Job/CronJob、后端和 V3 运行时升级均被明确排除。
- Secret 数据仅使用名称，计划中没有读取、断言或输出 Secret 值的步骤。
