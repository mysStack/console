# Workload V4 原生化迁移实施计划

> **当前状态（2026-10-25）：** `DEV / 进行中`。详情页通用 YAML 严格解析、非法 YAML 请求前拦截和三类合法 YAML 保存已完成当前制品验证；新增直达不存在资源时 404 页面为空白 Loading 的缺陷，已退回 DEV，先修复三类详情页 403/404/网络错误状态。

> **给执行者：** 必须按任务顺序执行。REA 未完成负责人复核前，不得修改业务代码；进入 DEV 后每个任务都要先补充或复用测试，再修改实现。

**目标：** 在 `feature/v4-workloads` 独立 Worktree 中完成 Deployment、StatefulSet、DaemonSet 的 V4 原生列表、详情、编辑设置和运维操作，并通过本地检查、131 部署、浏览器验收和独立 Draft PR。

**架构：** `release-4.1.5` 完整前端源码与同版本已部署页面是当前行为和样式主基线：源码用于定位实现，页面用于确认真实渲染、交互、请求和错误；`release-4.1.5` / `v3dist` 用于发布制品校准；`origin/release-3.4` 只解释当前版本无法说明的历史字段关系和交互。V4 继续使用 React、React Router、React Query、Workload Store 和 Kubed UI，三类资源共享公共底座，但每类资源分别记录字段、Action、RBAC、缓存、错误和浏览器结果。

**技术栈：** React、TypeScript、React Router、React Query、Kubernetes API、Kubed UI、Jest/仓库测试脚本、Playwright、GitHub Actions、131 K3s。

**规格依据：** `/home/bruce/code/ks-develop/console-v4-migration-plan.md`、`/home/bruce/code/ks-develop/v4-module-execution-rules.md`、`/home/bruce/code/ks-develop/v4-module-branch-registry.json`、`docs/v4-migration/module-execution.json`、`docs/v4-migration/workload-development-route-20261024.md`。

## 全局约束

- Worktree 固定为 `/home/bruce/code/ks-develop/console-workloads`，分支固定为 `feature/v4-workloads`。
- PR 目标固定为 `feature/v4-migration`；不修改 `release-4.1.5` 和 `feature/v4-migration`，不强推、不改写历史。
- 当前 V3 对比环境固定为 `kubesphere-system/ks-console-v415-rea`，访问 `http://192.168.2.131:30881`；现有 V4 使用 `http://192.168.2.131:30880`，两个 Deployment 和 Service 不得互相替换。
- 镜像、Secret、Token、测试账号和 Secret 测试值不得写入日志、截图、测试报告或提交。
- 所有新提交标题和说明使用中文；业务代码只能提交在当前模块分支。
- 阶段严格执行 `REA → DEV → VERIFY → PR`；门禁脚本不能代替证据复核、部署检查和浏览器验收。
- UI、路由、镜像和集群改动必须完成构建制品、部署、rollout、Pod imageID/digest 和部署后 Playwright 链路。

---

### 任务 1：固定 REA 输入并完成三类资源对比矩阵

**目标：** 将当前 `release-4.1.5` 集群基线页面与当前 V4 页面差异落到可逐项验收的矩阵中。

**文件：**

- 修改：`docs/v4-migration/workload-rea-review-20261024.md`
- 修改：`docs/v4-migration/workload-kind-capability-matrix.md`
- 修改：`docs/v4-migration/workload-action-api-rbac-evidence-20261023.md`
- 修改：`docs/v4-migration/workload-settings-source-evidence-20261024.md`
- 修改：`docs/v4-migration/matrix.md`
- 修改：`docs/v4-migration/agents-status.md`
- 修改：`docs/v4-migration/module-execution.json`
- 新建：`docs/v4-migration/evidence/workload-v415-baseline-browser-20261024.json`

**证据范围：**

- 逐项记录 Deployment、StatefulSet、DaemonSet 的入口、列表、详情、编辑设置、YAML、回滚、重启、删除、配置引用和资源专属 Action。
- 逐项记录更新策略、优雅终止、容器/初始化容器、镜像凭据、GPU、环境变量、端口协议、资源、安全上下文、调度、PVC 模板、Service 模板、元数据和停止语义。
- 对每项填写“`release-4.1.5` 制品观察、旧源码参考、当前 V4 对应、未验证项、影响和关闭方式”。
- 使用基线 `http://192.168.2.131:30881/consolev3/clusters/host/deployments` 与 V4 `http://192.168.2.131:30880/clusters/host/deployments`；基线 Deployment 为 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`，V3 tree 为 `1e499d92e11374e26c76f5e13be45251602bd596`。
- 集群级 Workload、项目级 Workload、联邦入口分开登记，不能用一个入口的结果推断另外两个入口。

**验证命令：**

```bash
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads start
git diff --check
```

**完成条件：** 三类资源的字段、Action、API、Store、RBAC、作用域、缓存、错误/取消和 V4 对应实现都有证据引用；未知项均有影响和关闭方式。REA 只确认主基线、证据覆盖和开发边界；运行时持久化、权限、缓存和逐项等价验证保留在 DEV/VERIFY 验收清单。

### 任务 2：REA 门禁复核与 DEV 准入

**目标：** 在任何业务代码变更前，完成当前材料复核并由负责人确认是否进入 DEV。

**文件：**

- 修改：`docs/v4-migration/module-execution.json`
- 修改：`docs/v4-migration/rea-analysis-summary.md`
- 修改：`docs/v4-migration/workload-rea-review-20261024.md`

**复核清单：**

- 确认 `release-4.1.5` 基线前端部署在 `kubesphere-system`，NodePort `30881`，Pod imageID 与记录一致。
- 确认当前 V4 `ks-console` 仍运行在 `30880`，不会把基线页面误当成 V4 验收。
- 确认 StatefulSet、DaemonSet 当前源码入口是否已接入 `WorkloadSettingsModal`；若源码、文档和浏览器结果冲突，以当前 SHA 重新取证并修正文档。
- 确认集群级入口是否加载 `wujie-app`、`/consolev3` 或旧 Embed；配置引用是否仍调用 `useV3action` 或桥接组件。
- 确认低权限 RBAC、namespace 隔离、缓存失效、403/404/409/422、网络失败和取消路径仍未被历史证据替代。

**门禁命令：**

```bash
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads commit --phase DEV
git diff --check
git commit -m "文档(Workload): 完善REA复核材料"
git push origin feature/v4-workloads
```

**完成条件：** 负责人在 `module-execution.json` 登记真实复核依据，并明确将阶段改为 `DEV`；在此之前只允许文档和证据提交。

### 任务 3：公共 Workload 底座与作用域闭环

**准入：** 仅在任务 2 明确进入 DEV 后执行。

**文件：**

- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/index.tsx`
- 复用/修改：`packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx`
- 复用/修改：`packages/console/src/pages/projects/containers/workloadScope.test.ts`
- 复用/修改：`packages/console/src/pages/clusters/containers/ApplicationWorkloads/nativeWorkloads.test.ts`
- 复用/修改：`packages/shared/src/stores/workload/index.ts`
- 复用/修改：`packages/shared/src/stores/workload/index.test.ts`

**实现内容：**

- 确保项目级和集群级列表、详情、直达 URL、返回、刷新和 namespace 切换都携带正确的 cluster、workspace、namespace、resource kind 和 name。
- 统一检查列表、详情、创建、PUT/PATCH、删除和 Watch 请求的 API 路径；按资源类型生成独立 query key。
- 对保存、删除、批量删除、Service 更新和 HPA 操作补齐成功后的列表/详情刷新及失败后的本地状态恢复。
- 403、404、409、422、网络失败和取消必须产生明确错误状态，不能出现假成功或跨 namespace 缓存串读。
- 删除普通 Workload 的当前运行入口对 `Workload/Workloads/Embed`、`consolev3` 和 Wujie 的依赖前，先用测试固定原生入口行为。

**测试顺序：**

```bash
corepack yarn jest packages/shared/src/stores/workload/index.test.ts packages/console/src/pages/projects/containers/workloadScope.test.ts packages/console/src/pages/clusters/containers/ApplicationWorkloads/nativeWorkloads.test.ts --runInBand
git diff --check
```

### 任务 4：Deployment 原生能力闭环

**文件：**

- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx`
- 复用/修改：`packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx`
- 复用/修改：`packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts`
- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/native.test.ts`
- 复用/修改：`packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.test.ts`
- 复用/修改：`packages/console/src/pages/projects/components/ConfigReference/workload.test.ts`

**实现与测试内容：**

- 覆盖基础信息、容器/初始化容器、镜像凭据、GPU、环境变量、端口、资源、探针、卷、调度、安全上下文、更新策略、优雅终止、元数据和配置引用。
- 保存时保留 `resourceVersion`、未知字段、ownerReferences 和未编辑字段；验证清空与保留语义。
- 验证 Deployment 的 `maxUnavailable/maxSurge`、副本数、回滚、重启、删除和 HPA 关联行为。
- 验证配置引用编辑、取消、冲突和失败重试不调用 V3 Action，不泄露 Secret 明文。

### 任务 5：StatefulSet 与 DaemonSet 差异能力闭环

**文件：**

- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/index.tsx`
- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/native.test.ts`
- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/index.tsx`
- 复用/修改：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/native.test.ts`
- 复用/修改：`packages/console/src/pages/clusters/components/Modals/StatefulSetServiceModal/servicePatch.ts`
- 复用/修改：`packages/console/src/pages/clusters/components/Modals/StatefulSetServiceModal/servicePatch.test.ts`
- 复用/修改：`packages/console/src/pages/projects/components/WorkloadCreateModal/daemonset.locale.test.ts`

**StatefulSet：**

- 验证 `serviceName`、Headless Service、Service selector、`volumeClaimTemplates`、挂载校验、partition 和 `OnDelete` 更新策略。
- Service 保存、403/404/422、取消和重新打开必须分别有测试和 Network 证据。

**DaemonSet：**

- 验证没有副本数编辑，使用 DaemonSet 更新策略、`maxUnavailable`、`minReadySeconds`、节点调度和停止/恢复语义。
- 禁止直接把 Deployment 的 `spec.replicas=0` 当作 DaemonSet 停止实现；以当前 V3 制品观察和 API 回读确认等价行为。

### 任务 6：本地验证、131 VERIFY 和 PR

**本地验证：**

```bash
./scripts/test.sh
corepack yarn build:packages
git diff --check
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads commit
```

**部署验证：**

1. 按 `feature-v4-workloads-上海时间-Git短SHA` 生成镜像标签。
2. 运行 `python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads deploy --tag <镜像标签>`。
3. 构建并推送当前 SHA 的镜像，记录 CI Run、镜像 digest、Deployment generation、rollout、Pod Ready 和 imageID。
4. 在新浏览器上下文登录 `30880`，执行三类资源的列表、详情、直达、刷新、返回、编辑、保存、取消、删除、批量操作、配置引用、错误和 namespace 隔离。
5. 使用低权限账号完成读取允许、编辑拒绝、删除拒绝和 StatefulSet Service 拒绝路径；缺少低权限条件时保持阻塞。
6. 保留 `30881` 的 `release-4.1.5` 基线页面，逐条回读 V3/V4 对比结果。

**PR 收尾：**

```bash
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads pr --pr 2
```

更新 `matrix.md`、`agents-status.md`、`module-execution.json` 和 VERIFY 证据，保持 PR #2 Draft，等待负责人复核，不自动合并。

## 计划自检

- REA 输入固定、基线部署和三类资源差异分别有任务覆盖。
- StatefulSet Service/PVC 和 DaemonSet 停止语义没有被公共 Deployment 流程替代。
- API、Store、Action、RBAC、namespace、缓存、错误和浏览器场景都有对应测试或证据任务。
- 计划没有授权在 REA 阶段修改业务代码，也没有把历史镜像或历史浏览器结果当作当前 VERIFY。
