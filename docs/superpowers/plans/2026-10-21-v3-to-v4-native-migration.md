# KubeSphere Console V3 → V4 原生化迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以现有 V3 源码、当前 `v3dist`、REA 证据和 131 浏览器证据为行为基线，逐模块把 KubeSphere Console 重构为 V4 原生实现，最终移除所有实际启用功能对 V3/Wujie 的运行时依赖。

**Architecture:** 先把 V3 源码中的页面、Action、Store、API、RBAC、作用域、缓存和错误行为整理成模块行为基线，再复用当前 `packages/core`、`packages/console`、`packages/shared` 中的 React、React Router、React Query、Store、ListPage、DataTable 和 Kubed UI 实现 V4 原生模块。每个模块独立完成 `REA → DEV → VERIFY → PR`，全局 P0 风险继续记录但不统一阻塞已具备模块依据的核心模块。

**Tech Stack:** React、TypeScript、React Router、React Query、Kubed UI、Kubernetes API、Jest/仓库测试脚本、Playwright、Docker/GitHub Actions、131 K3s 测试环境。

**Spec:** `../console-v4-migration-plan.md`、`docs/v4-migration/matrix.md`、`docs/v4-migration/rea-analysis-summary.md`。

## 全局约束

- 当前仓库：`/home/bruce/code/ks-develop/console`。
- 当前开发分支：`feature/v4-configmaps-secrets`；集成分支：`feature/v4-migration`；稳定分支 `release-4.1.5` 不修改。
- 保留已有 Worktree、Git 历史、Draft PR #1 和已完成迁移提交；不强推、不改写历史、不自动合并。
- 使用单 Codex 会话顺序执行，不调用 `spawn_agent`，子 Agent 不参与本计划。
- DevOps、KubeFed、KubeEdge、Notification 是后续插件对接范围；当前不安装、不配置、不补造 Fixture，不作为核心资源统一阻塞，但保留为“后置、未验证”。
- 核心范围包括 ConfigMap、Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet、Pod、Service、Ingress、Job、CronJob、Storage、Network、ConfigReference、应用模板和应用部署等实际启用模块。
- 不通过删除菜单、隐藏页面、空白页、保留 V3 弹窗或继续加载 `/consolev3` 来宣称完成。
- 页面或路由变更必须完成：本地测试 → 构建制品 → 部署 131 → rollout 成功 → Pod imageID 与 digest 对应 → 新浏览器登录 → Playwright 验收。
- 浏览器账号从 `/home/bruce/.bashrc` 的测试环境变量读取；任何输出、日志、截图、文档、测试配置和提交都不得包含用户名密码、Token、Kubeconfig 或 Secret 明文。
- 当前 131 是测试环境；生产、稳定分支和非测试业务资源不操作。测试资源使用唯一名称和标签，只清理本轮创建的对象，不删除 `v4-migration-e2e` namespace。
- 镜像 tag 使用 `分支名-上海时间-Git短SHA`；每次部署记录 Git SHA、CI Run、镜像 tag、digest 和 Pod imageID。

## 行为基线与证据规则

1. `origin/release-3.4` 的 V3 源码用于还原页面结构、Action、Store、API 和已知业务流程；不能假定它与当前 `v3dist` 完全相同。
2. 当前 `packages/bootstrap/assets/v3dist` 用 REA 做制品差异和入口定位；当前已形成摘要证据 `ev_fcff357b62b59dde503f98837df84bb87e06ba6db2a48c7616ec1bda2ac6c9c8`，其语义图存在截断，不能单独作为完整行为结论。
3. 131 的真实浏览器、Network、Kubernetes API 和部署回读用于确认当前真正启用的路由、请求、权限和错误行为。
4. 每个模块的行为矩阵必须逐项记录：路由、列表、详情、创建、编辑、YAML、批量操作、删除、事件、历史、配置引用、缓存刷新、返回/刷新、错误/取消、RBAC、namespace 隔离、V3 对照和 V4 文件。
5. 旧源码行为、REA 静态事实、浏览器观察、API 返回和推断必须分栏记录；不能把静态字符串、页面可渲染或单个 `200` 当成功等价。

## 阶段顺序

| 阶段 | 范围                                               | 交付物                                                         | 进入下一阶段条件                                      |
| ---- | -------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| M0   | 全局基线与风险                                     | 分支/制品身份、V3/Wujie 清单、全局 P0 风险                     | 风险可追踪；不阻塞已有模块依据                        |
| M1   | V4 公共资源底座                                    | 作用域、Store、缓存、权限、列表/详情公共行为矩阵               | 公共底座变更有单测和跨 namespace 证据                 |
| M2   | ConfigMap、Secret、ServiceAccount                  | 原生资源功能和部署后验收                                       | 每个模块独立 VERIFY 记录完整缺口                      |
| M3   | Deployment、StatefulSet、DaemonSet                 | 项目列表、详情和运维 Action 原生化                             | 列表不再依赖 V3；部署后浏览器和 RBAC 通过             |
| M4   | Pod、Service、Ingress、Job、CronJob                | 日志、终端、端口、执行和暂停等原生流程                         | 模块行为矩阵闭合并完成部署验收                        |
| M5   | Storage、Network、告警、监控                       | PVC/PV、快照、网络和监控原生流程                               | 启用功能逐项验收                                      |
| M6   | 应用模板、应用部署、ConfigReference 等复杂核心模块 | V3 Action 替代、错误态和权限闭环                               | 核心动态 Action 不再依赖 V3                           |
| M7   | 后置插件                                           | DevOps、KubeFed、KubeEdge、Notification 独立 REA/DEV/VERIFY/PR | 具备扩展、CRD、Fixture 后再开始                       |
| M8   | 全局清理和发布候选                                 | V3/Wujie 依赖、路由和构建清理                                  | 所有核心/后置模块验收完成后，才删除兼容层并准备 4.2.0 |

## 第一批执行：Workload 列表原生化

第一批目标是项目级 Deployment、StatefulSet、DaemonSet 列表。详情页已存在 V4 原生实现，但当前三个列表入口仍使用 `ConsoleV3ResourceList`，因此先关闭这个真实的核心 V3 运行时缺口。

### Task 1：建立 Workload 行为基线

**Files:**

- Read: `origin/release-3.4:src/pages/projects/containers/Deployments/index.jsx`
- Read: `origin/release-3.4:src/actions/workload.js`
- Read: `packages/console/src/pages/clusters/containers/Workload/Deployments/index.tsx`
- Read: `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx`
- Read: `packages/shared/src/stores/workload/index.ts`
- Update: `docs/v4-migration/deployment-v3-evidence.md`
- Update: `docs/v4-migration/deployment-gap-matrix.md`
- Update: `docs/v4-migration/matrix.md`

- [ ] 对照旧源码记录三类列表的 namespace、表格列、状态、详情跳转、创建入口、编辑信息、编辑 YAML、重建、删除、批量删除、停止/伸缩和错误行为。
- [ ] 将旧 V3 Action 映射到现有 V4 `workloadStore`、原生详情路由和公共弹窗，记录不能直接复用的差异。
- [ ] 用当前 131 制品的浏览器/Network 证据确认当前项目列表仍请求 `/consolev3` 或 `ConsoleV3ResourceList`，并记录当前制品身份。
- [ ] 在三份文档中写入基线 SHA、REA/源码路径、观察结果、推断、未知项和第一批关闭条件。

### Task 2：先写项目 Deployment 列表失败测试

**Files:**

- Create: `packages/console/src/pages/projects/containers/Deployments/index.test.ts`
- Test: `packages/console/src/pages/projects/containers/Deployments/index.tsx`

- [ ] 测试源文件必须断言项目 Deployment 列表使用 `DataTable`、`workloadStore('deployments')`、当前路由 `namespace` 和原生详情链接。
- [ ] 测试源文件必须断言项目 Deployment 列表不再包含 `ConsoleV3ResourceList`、`wujieUrlPrefix`、`WujieReact` 或 `consolev3`。
- [ ] 运行 `corepack yarn jest packages/console/src/pages/projects/containers/Deployments/index.test.ts --runInBand`。
- [ ] 在生产代码未修改时确认测试因旧 V3 实现而失败，并保留失败原因作为 RED 证据。

### Task 3：实现项目 Deployment 原生列表

**Files:**

- Modify: `packages/console/src/pages/projects/containers/Deployments/index.tsx`
- Reuse: `packages/console/src/pages/clusters/containers/Workload/Deployments/index.tsx`
- Reuse: `packages/shared/src/stores/workload/index.ts`
- Reuse: `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/routes.tsx`

- [ ] 使用 `useParams` 固定 `cluster`、`workspace`、`namespace`，列表请求必须使用当前项目 namespace 的 namespaced workload URL。
- [ ] 复用 V4 `workloadStore`、`mapper`、`DataTable`、`WorkloadStatus`、`EditBaseInfoModal`、`EditYamlModal`、`RecreateModal`、`DeleteConfirmModal` 和现有权限动作。
- [ ] 项目列表不显示跨 namespace 选择器；列表链接必须保留 workspace、cluster、namespace 和 Deployment 名称。
- [ ] 成功、失败和取消回调必须刷新当前表格或保持对象未改变；不能用旧 V3 Action 代发请求。
- [ ] 运行同一个 Jest 命令确认测试 GREEN，再运行受影响的现有 Workload/Detail 测试。

### Task 4：迁移 StatefulSet 和 DaemonSet 项目列表

**Files:**

- Create/Modify: `packages/console/src/pages/projects/containers/StatefulSets/index.test.ts`
- Modify: `packages/console/src/pages/projects/containers/StatefulSets/index.tsx`
- Create/Modify: `packages/console/src/pages/projects/containers/DaemonSets/index.test.ts`
- Modify: `packages/console/src/pages/projects/containers/DaemonSets/index.tsx`
- Reuse: corresponding native detail routes and `workloadStore`

- [ ] 分别先写测试并运行到 RED，确认两个列表仍是 V3 包装入口。
- [ ] 按 Deployment 列表的原生实现方式替换，但保留 StatefulSet 的重建/滚动行为差异和 DaemonSet 不提供 HPA 的行为边界。
- [ ] 确认三类项目列表的 API 请求都包含当前 namespace，且详情链接使用对应原生 detail route。
- [ ] 运行三个列表测试、详情测试和相关共享 Store 测试，全部通过后再进入构建。

### Task 5：第一批本地质量验证

- [ ] 执行 `corepack yarn jest packages/console/src/pages/projects/containers/Deployments/index.test.ts packages/console/src/pages/projects/containers/StatefulSets/index.test.ts packages/console/src/pages/projects/containers/DaemonSets/index.test.ts --runInBand`。
- [ ] 执行 `./scripts/test.sh`，记录文件数、测试数和失败分类。
- [ ] 执行 `corepack yarn build:packages`。
- [ ] 执行变更范围相关的 ESLint/Prettier/TypeScript 检查和 `git diff --check`。
- [ ] 对照 `git diff`，确认没有修改稳定分支、没有把 `dist`、截图、`.playwright-cli` 或凭据加入提交。

### Task 6：第一批 131 部署和浏览器 VERIFY

- [ ] 生成 tag：`feature-v4-configmaps-secrets-上海时间-Git短SHA`，记录 Git SHA、CI Run、镜像 digest。
- [ ] 按授权构建并推送测试镜像，更新 131 `kubesphere-system/ks-console`，等待 rollout 成功并回读 Pod imageID。
- [ ] 使用新浏览器上下文从测试环境变量登录，不复用旧会话。
- [ ] 逐项验证三个项目列表：当前 namespace 数据、跨 namespace 哨兵隔离、列表/详情、直达 URL、刷新、返回、编辑、YAML、重建、删除、批量删除、取消、错误反馈和 Network。
- [ ] 使用 viewer/operator/admin 等已有测试角色验证成功和拒绝路径；缺少真实角色或 fixture 时记录为未验证，不用 admin 代替低权限。
- [ ] 只清理本轮创建的 Workload、HPA、ConfigMap、Secret、账号和绑定；复核 `v4-migration-e2e` 无本轮残留。
- [ ] 更新 `matrix.md`、`v3-action-equivalence-matrix-20261018.md`、`agents-status.md` 和 `verification-closure-20261021.md`，记录部署身份、浏览器结果、未验证项和下一步。

### Task 7：提交第一批独立变更

- [ ] 运行 `git status --short --branch` 和 `git diff --check`，只暂存 Workload 代码、测试和对应中文文档。
- [ ] 创建一个描述实际行为变化的提交，例如 `feat: migrate project workload lists to native v4`。
- [ ] 推送当前功能分支，不强推、不改写历史、不自动合并 Draft PR #1。
- [ ] 提交后回读 Git SHA、远程分支、PR 状态和 131 部署身份，并在 `agents-status.md` 写入独立结果。

## 后续模块执行规则

- 每个模块都必须先建立“V3 源码 + 当前制品 REA + 131 运行时”的行为矩阵，再进入代码修改。
- 先替换真实 V3 入口，再补齐操作、错误态、权限和缓存；页面能打开不能作为完成条件。
- 共享组件或 Store 改动必须补跑所有受影响资源模块的回归。
- 任何模块完成后只标记该模块状态，不把它扩大为全部 RBAC、全部 V3 等价或全局 P0 通过。
- API Server 故障验证当前已完成限定范围；后续模块仍需记录其自身 API 错误反馈，不能把故障注入结果当作模块功能等价。
- 只有所有核心模块和后置插件模块完成部署后验收，才允许做全局 V3/Wujie 清理和最终发布候选。

## 完成定义

项目完成必须同时满足：核心和后置范围内每个实际启用功能均有 V4 原生实现；每项功能、Action、API、RBAC、作用域、缓存、错误和返回行为均有部署后证据；构建和运行时不再依赖 V3/Wujie；完整矩阵、运行时故障范围、Git/镜像/Pod 身份和遗留风险均已记录，并经过负责人复核。
