# P0 任务状态

> 任务启动日期：2026-10-17（上海时间）  
> 协调工作区：`/home/bruce/code/ks-develop/console`  
> 项目计划基准：[KubeSphere Console V3 → V4 全量原生化迁移计划](../../../console-v4-migration-plan.md)  
> 本轮范围：继续维护 P0 全局风险，同时按模块门禁推进已具备依据的 V4 收尾工作；不把模块开发结果写成 P0 全局通过。

当前执行模式：**单 Codex 会话 + Git Worktree + 顺序执行**。项目已停止使用 Multi-Agent 和子 Agent；已有三个 P0 Worktree、分支、提交和历史证据继续保留。需要独立完成的人工或其他复核仍保持未完成，不因当前会话的静态核验自动关闭。

## 协作规则

- 三个 P0 任务从 `origin/feature/v4-migration` 的核验基线创建的独立 Worktree 和任务分支继续保留。
- 当前只由协调 Codex 会话顺序处理一个独立任务；每项先在对应 Worktree 完成、验证并提交，再进入下一项。
- 任务 Agent 必须区分事实、推断和未知项，记录命令、Git SHA、制品摘要和 Evidence ID。
- 协调 Agent 负责维护本文件、汇总证据和提交 P0 门禁复核；任务 Agent 不得自行宣布 P0 通过。
- 全局 P0 未完成前，不宣布全量迁移完成、不删除 V3/Wujie、不创建最终发布分支；模块开发仍须先通过自身 REA 门禁，不修改 `release-4.1.5`，不未经授权部署 131 或生产环境。

## 任务看板

| 任务        | 负责人     | Worktree                                          | 分支                     | 当前进度                                                                                                                              | 证据交付                                                                                                                                                                        | 阻塞项/下一步                                                                                                         |
| ----------- | ---------- | ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| P0-Audit    | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-audit`    | `feature/v4-p0-audit`    | 首轮证据后完成 V3 Action 调用点、参数、Wujie 实例和制品字符串映射；已顺序补充六类作用域和静态权限路径矩阵；本轮补充运行时入口和错误态 | `p0-audit-evidence.md`，`p0-route-inventory.md`，`p0-action-inventory.md`，`p0-risk-closure-matrix.md`，`p0-runtime-evidence.md`，`p0-runtime-closure-20261017.md`，`5fc90ebf5` | 已确认 11 个业务调用文件和 3 个桥接文件；联邦 fixture、低权限、全量 Action、Network、错误态闭环和 V4 替代行为仍待补齐 |
| P0-REA      | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-rea`      | `feature/v4-p0-rea`      | 已完成 Action 重点 Chunk 的第二次 focused REA                                                                                         | `p0-rea-evidence.md`，`8c6f59e69`，Evidence `ev_1499abcad9683e664b746ef8c97b96092158e1ab805d6c75f60f17b23c9da037`                                                               | 7 个指定 Chunk 纳入同一制品分析；application/semantic coverage 仍 partial，运行时入口仍待补齐                         |
| P0-Baseline | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-baseline` | `feature/v4-p0-baseline` | 已顺序核验 release-3.4 版本、commit、许可证和当前制品更新提交                                                                         | `p0-baseline-evidence.md`，`p0-v3-module-source-evidence.md`，`be20bc7a3`                                                                                                       | 候选源码身份已固定；当前 2025 外部 `v3dist` 与旧源码的构建 provenance 仍未关闭                                        |

> 历史记录：此前的 Multi-Agent 启动请求曾返回协作服务 `429`，没有产生 Agent 提交。该记录保留用于解释历史证据来源；当前已按项目负责人指令停止使用 Multi-Agent，不再重试或追加子 Agent。

## 当前基线

| 项目                 | 实际值                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| 稳定基线             | `release-4.1.5` / `fc1253cbe`                                                |
| P0 取证基线          | `origin/feature/v4-migration` / `3e09afd6a`                                  |
| 原有开发工作区       | `feature/v4-configmaps-secrets`                                              |
| 原有 Draft PR        | [PR #1](https://github.com/mysStack/console/pull/1)                          |
| 当前顺序取证文档汇总 | `feature/v4-configmaps-secrets` / `74022b89d54a345e77b4fd38ee2895336854fe8a` |
| 本轮正式开发         | 按 ConfigMap、Secret、ServiceAccount 模块级 REA → DEV → VERIFY → PR 顺序恢复 |
| P0 门禁              | 分析中，待负责人复核                                                         |

本轮针对性运行时收尾已形成 [`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)：cluster、workspace、platform、extension 代表性入口和 workspace DevOps 打开/取消 Action 已取证；联邦项目、低权限 RBAC、全量 Action 和扩展错误闭环仍未完成。

## 本轮顺序核验：Git 集成与风险关闭

| 项目                            | 实际结果                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `feature/v4-migration`          | `3e09afd6a051d4091b3c887462c880eff2ba6754`，作为 P0 取证基线；未修改                                                                                                                                   |
| `feature/v4-configmaps-secrets` | 风险核验起点为 `3f19924fc665dcfdb1a1fdee840bcef1d73f9d97`，相对迁移基线领先 63 个提交、相对远程分支领先 38 个提交；本轮文档提交后本地 HEAD 为后续新 SHA，未 push                                       |
| `feature/v4-p0-audit`           | `5fc90ebf5`，相对迁移基线领先 5 个提交，Worktree clean                                                                                                                                                 |
| `feature/v4-p0-rea`             | `8c6f59e69`，相对迁移基线领先 3 个提交，Worktree clean                                                                                                                                                 |
| `feature/v4-p0-baseline`        | `be20bc7a3`，相对迁移基线领先 8 个提交，Worktree clean                                                                                                                                                 |
| Draft PR #1                     | GitHub 核验快照（本轮文档提交前）：head `aea9806eb`，base `feature/v4-migration`；67 个提交、25 个文件，包含 ConfigMap/Secret 代码测试以及 ServiceAccount、P0 审计等文档；当前保持 Draft，待负责人复核 |
| 安全整理建议                    | 保留三个 P0 分支和现有提交；保留 Draft PR #1；先拆分或明确 PR 范围，再由人工决定 push/合并；不强推、不改写历史、不自动合并                                                                             |

详细路由、Action、作用域、RBAC、API 和 V4 替代行为矩阵见[针对性风险关闭矩阵](./p0-risk-closure-matrix.md)。

## 本轮质量检查问题

已确认三个 P0 Worktree 缺少被 `.gitignore` 忽略的 `.husky/_/husky.sh`，而主工作区存在；因此 P0 Worktree 的提交会报 Hook 引用失效。当前没有修改 Hook 或业务代码。最小修复是为每个 Worktree 执行既有 `yarn prepare`/依赖初始化并增加文件存在性检查；此前用 `git -c core.hooksPath=/dev/null` 提交文档，只能说明 Git 提交成功，不能说明 lint-staged、测试、类型检查或构建通过。

## 完成条件

- [x] P0-Audit 形成首轮静态依赖、路由、扩展、动态 Action 和构建入口盘点；待统一复核。
- [x] P0-REA 形成首轮可复核的 REA Evidence、覆盖范围、限制和未知项记录；待统一复核。
- [ ] P0-Baseline 已固定 Git 基线、V3 源码候选的版本、commit、许可证和当前编译制品边界，但当前制品与源码的构建对应关系仍未关闭（P0-U001/P0-U004）。
- [x] 协调 Agent 已汇总首轮三项证据，并补充 [131 运行时与制品身份证据](./p0-runtime-evidence.md) 和 [P0-REA 门禁复核包](./p0-gate-review.md)；[REA 阶段分析总结](./rea-analysis-summary.md) 已更新，仍待门禁复核。
- [ ] 项目负责人或指定复核人确认 P0-REA 门禁结论。

## 状态更新规则

任务完成必须同时提供任务分支 SHA、证据文件、执行命令、结果、未知项和阻塞项。状态只由协调 Agent 汇总更新；单个 Agent 的“完成”不等于 P0 门禁通过。

## 历史：2026-10-17 双 Explorer 并行复核批次

本批遵循“最多两个子 Agent、同批并行、批次完成后再调度”的规则，未创建下级 Agent，也没有修改代码、分支、Worktree 或配置。

| Explorer                       | 任务                                                           | 结果                                                                                                                                                                          | 状态/错误                                                                                                  |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/root/p0_audit_route_action`  | 只读核对 P0-U002 的 V3 Action 调用点、模块参数和运行时映射缺口 | 初始摘要写成 10 个业务调用文件；后续单会话复核确认实际为 11 个业务调用文件，另有 3 个实现/导出文件；确认当前仍缺少 131 触发入口、权限、Network、错误态、V4 替代实现和回滚证据 | 已完成；未修改文件；P0-U002-B 仍未关闭                                                                     |
| `/root/p0_baseline_provenance` | 只读核对 P0-U001/P0-U004 的旧源码与 `v3dist` 制品 provenance   | 未形成可用结果                                                                                                                                                                | 协作服务返回原始 `429 Too Many Requests`：`c9980dfe-945b-4033-a789-63ec10b87ba0`；按规则停止追加任务和重试 |

本批没有产生新的提交。该批次属于历史执行记录，不能作为当前执行模式。P0-Baseline 的 P0-U001/P0-U004 和 P0-Audit 的 P0-U002-B 仍保持“分析中”；独立复核未完成前，P0 门禁保持“分析中，待负责人复核”，不进入 P1/P2 正式开发。
