# Workload 旧 V3 参考口径与 V4 开发路线调整计划

> **给执行者：** 本计划按 `REA → DEV → VERIFY → PR` 顺序执行。当前模块仍处于 REA，只有完成本计划的 REA 复核记录后，才能开始业务代码修改。

**目标：** 在固定 `release-4.1.5` `v3dist` 制品证据的基础上，使用已核验的 `origin/release-3.4` 旧 V3 源码作为结构、字段和样式参考，完成 Deployment、StatefulSet、DaemonSet 的 V4 原生化迁移，并通过 131 部署和浏览器验收。

**架构：** `release-4.1.5` 的 `v3dist` 负责证明当前发布制品中的真实入口、字段、静态资源和运行时行为；`origin/release-3.4` 只负责解释旧 V3 的组件结构、字段关系和历史交互。V4 实现继续复用现有 React、React Router、React Query、Workload Store、Kubed UI 和共享资源组件，不复制 V3 代码或样式。三类资源共用底座，但分别保留字段、Action、RBAC、缓存和浏览器验收结果。

**技术栈：** React、TypeScript、React Router、React Query、Kubed UI、Kubernetes API、仓库测试脚本、Playwright、GitHub Actions、131 K3s 测试环境。

**规格依据：** `/home/bruce/code/ks-develop/console-v4-migration-plan.md`、`/home/bruce/code/ks-develop/v4-module-execution-rules.md`、`/home/bruce/code/ks-develop/v4-module-branch-registry.json`、`docs/v4-migration/module-execution.json`。

## 全局约束

- 当前模块 Worktree：`/home/bruce/code/ks-develop/console-workloads`。
- 当前分支：`feature/v4-workloads`，PR 目标固定为 `feature/v4-migration`。
- 当前制品 REA 基线：`release-4.1.5` / `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`，`v3dist` tree 为 `1e499d92e11374e26c76f5e13be45251602bd596`。
- 旧 V3 可读参考：`origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26`，许可证为 AGPL-3.0；该引用不代表当前 `v3dist` 的构建来源。
- `release-3.1.4` 在当前本地和已核验远程中不存在，不再作为本轮硬性输入；缺失事实保留在风险记录中。
- 当前阶段为 `REA / 分析中，待复核`。REA 阶段只允许取证和记录，不允许业务编码、构建部署或 VERIFY。
- 不修改 `release-4.1.5`、`feature/v4-migration`，不强推、不改写已有历史，不自动合并 PR #2。
- 不删除功能、不隐藏菜单、不保留 V3 弹窗作为迁移结果，不新增 V3/Wujie 运行时依赖。
- UI 或路由改动必须执行本地测试、构建、部署 131、rollout、Pod imageID/digest 核对和新浏览器上下文 Playwright 验收。
- 测试账号从 `/home/bruce/.bashrc` 的环境变量读取；任何日志、截图、测试报告和提交都不得写入凭据。

## 阶段 1：重新绑定 REA 输入并完成复核材料

**文件：**

- 修改：`/home/bruce/code/ks-develop/console-v4-migration-plan.md`
- 修改：`docs/v4-migration/governance/console-v4-migration-plan.md`
- 修改：`docs/v4-migration/module-execution.json`
- 修改：`docs/v4-migration/rea-analysis-summary.md`
- 修改：`docs/v4-migration/matrix.md`
- 修改：`docs/v4-migration/agents-status.md`
- 修改：`docs/v4-migration/workload-rea-source-correction-20261024.md`
- 修改：`docs/v4-migration/workload-kind-capability-matrix.md`
- 修改：`docs/v4-migration/workload-v3-field-equivalence-20261023.md`
- 修改：`docs/v4-migration/workload-settings-source-evidence-20261024.md`
- 新建：`docs/v4-migration/evidence/workload-style-rea-20261024.json`

- [x] 将当前制品固定为 `release-4.1.5` 的 `v3dist`。
- [x] 将 `origin/release-3.4` 固定为旧 V3 结构、字段和样式参考，并记录其 commit 与许可证。
- [x] 保留 `release-3.1.4` 不存在的事实，不把 `release-3.4` 伪装成 `release-3.1.4`。
- [ ] 重新检查三类资源的路由、字段、默认值、校验、Action、API、Store、RBAC、作用域、缓存、错误和样式证据。
- [ ] 为每一项标记“制品观察 / 旧源码参考 / 运行时观察 / V4 对应 / 未知及影响”。
- [ ] 将 `module-execution.json` 的 REA 状态保持为“分析中，待复核”，直到复核材料完整。
- [ ] 运行：

```bash
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads start
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads commit --phase REA --records-only
git diff --check
```

- [ ] 使用中文提交标题提交文档变更并推送 `feature/v4-workloads`。

## 阶段 2：REA 复核门禁

**交付物：**

- `docs/v4-migration/rea-analysis-summary.md`
- `docs/v4-migration/workload-kind-capability-matrix.md`
- `docs/v4-migration/workload-v3-field-equivalence-20261023.md`
- `docs/v4-migration/workload-action-api-rbac-evidence-20261023.md`
- `docs/v4-migration/workload-settings-source-evidence-20261024.md`
- `docs/v4-migration/evidence/workload-style-rea-20261024.json`
- `docs/v4-migration/module-execution.json`

- [ ] Deployment、StatefulSet、DaemonSet 三类资源的公共能力和差异能力均有证据引用。
- [ ] 配置引用、镜像凭据、GPU、环境变量、端口协议、更新策略、优雅终止、调度、安全上下文、PVC 模板、Service 模板、元数据和停止语义分别列入矩阵。
- [ ] 旧源码只作为参考，当前行为以 `release-4.1.5` 制品和真实页面/Network/API 为准。
- [ ] 未知项必须有影响范围和关闭方式；影响功能正确性、权限或数据保留的未知项不得直接放行。
- [ ] 由负责人复核 REA 材料后，将模块阶段明确改为 `DEV`；在此之前不得修改业务代码。

## 阶段 3：DEV 实现顺序

进入 DEV 后，仍使用同一个 Worktree 和分支，按以下顺序提交小范围变更：

1. **公共底座：** Workload 列表/详情路由、Store、权限参数、namespace 作用域、缓存失效、错误态和公共操作。
2. **Deployment：** 基础信息、容器/初始化容器、镜像凭据、GPU、环境引用、端口协议、资源、安全上下文、调度、更新策略、优雅终止、元数据、配置引用和运维 Action。
3. **StatefulSet：** 在公共底座上补齐 Service 配置、Headless Service、PVC 模板、partition/OnDelete 等差异。
4. **DaemonSet：** 补齐无副本语义、更新策略、节点调度和停止/恢复语义；不得使用 Deployment 的 `replicas=0` 直接替代。

每个功能先补充或复用回归测试，再修改实现；每个提交只包含当前能力及其文档、测试。共享底座改动必须在提交说明中列出三类资源的影响范围。

## 阶段 4：DEV 本地验证

每个 DEV 增量完成后执行：

```bash
./scripts/test.sh
corepack yarn build:packages
git diff --check
```

受影响的 Workload 定向测试、TypeScript、ESLint 和 Prettier 必须同时记录。仅本地测试通过不能标记 VERIFY 或模块验收通过。

## 阶段 5：VERIFY 部署与浏览器验收

- [ ] 按 tag 规则生成：`feature-v4-workloads-上海时间-Git短SHA`。
- [ ] 执行 `v4-module-gate.py workloads deploy --tag <镜像标签>`。
- [ ] 记录 CI Run、镜像 digest、Deployment 配置、rollout、Pod Ready 和实际 Pod imageID。
- [ ] 使用新浏览器上下文从 `/home/bruce/.bashrc` 登录 131，执行直达、刷新、返回、namespace 切换、列表、详情、编辑、保存、取消、删除、批量操作和错误路径。
- [ ] 使用两个 namespace 哨兵资源验证项目页面不显示其他 namespace 数据；集群页面的全量范围单独验证。
- [ ] 使用有权限和低权限账号验证正向、403、404、网络失败和控件可见性。
- [ ] 对 Deployment、StatefulSet、DaemonSet 分别记录 V3 功能等价结论，不用一类资源结果替代另外两类。
- [ ] 只清理本轮创建的测试资源，不删除测试 namespace。

## 阶段 6：PR 收尾

- [ ] 更新 `matrix.md`、`agents-status.md`、`module-execution.json` 和 VERIFY 证据。
- [ ] 所有未完成项明确标记为未验证、部分通过或阻塞。
- [ ] 执行 `python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads pr --pr 2`。
- [ ] 保持 PR #2 Draft，等待负责人审核；不自动合并、不进入下一个模块。

## 完成判定

只有同时满足以下条件，Workload 模块才能标记为“已验收”：

- REA 复核通过，且当前制品、旧源码参考和运行时证据边界清楚。
- Deployment、StatefulSet、DaemonSet 三类资源的功能矩阵全部闭环。
- 本地测试、构建、部署、rollout、Pod imageID/digest 和 Playwright 证据属于同一 Git SHA。
- RBAC、namespace 隔离、缓存失效、错误态、返回/刷新和 V3 功能等价均有结果。
- 没有依赖 V3 Action、Wujie、`/consolev3` 或隐藏 V3 弹窗完成功能。
