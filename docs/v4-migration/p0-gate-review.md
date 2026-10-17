# P0-REA 门禁复核包

> 复核材料生成日期：2026-10-17（上海时间）  
> 复核对象：`feature/v4-configmaps-secrets`（复核时以 `git rev-parse HEAD` 回读文档提交）  
> 迁移基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`  
> 门禁状态：**分析中，待负责人复核；不能进入下一阶段**

本文件把 P0-REA 的完成条件逐项列出，方便项目负责人在同一组证据上复核。它不把历史实现、历史部署或协调 Agent 的自检结果写成门禁通过。

## 1. 条件核对

| 条件                                                      | 当前结论                 | 证据和限制                                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git 基线、分支和 Worktree 已固定                          | 已完成                   | `agents-status.md`；三个 P0 Worktree 和任务分支均存在且干净；主工作区保留原有未跟踪文件，未覆盖或删除                                                                                                                                                                 |
| V3/Wujie、`ConsoleV3ResourceList`、扩展和构建引用静态盘点 | 已完成首轮               | `p0-audit-evidence.md`、`p0-route-inventory.md`、`dependency-inventory.md`；文件计数是候选引用，不等于全部启用路由                                                                                                                                                    |
| V3 路由、V4 路由树和动态 Action 对照                      | 已完成静态补充           | `p0-route-inventory.md`、`p0-action-inventory.md`、[针对性风险关闭矩阵](./p0-risk-closure-matrix.md)、`feature/v4-p0-audit` / `5fc90ebf5`；已补齐 11 个业务调用文件、3 个桥接文件、作用域和静态权限路径；全量启用入口、权限和 Action 运行时映射仍待完成               |
| 旧 V3 源码候选和模块行为                                  | 已完成候选身份核验       | `p0-v3-module-source-evidence.md`、`p0-baseline-evidence.md`、`feature/v4-p0-baseline` / `be20bc7a3`；已固定 release-3.4 commit、版本 `3.0.0`、AGPL-3.0、构建入口和历史 `8843eadf1` 身份，但未证明它们就是当前 2025 外部 `v3dist` 的构建来源                          |
| `v3dist` focused REA                                      | 已完成第二轮重点补充     | `p0-rea-evidence.md`、`feature/v4-p0-rea` / `8c6f59e69`、Evidence `ev_1499abcad9683e664b746ef8c97b96092158e1ab805d6c75f60f17b23c9da037`；7 个指定 Chunk 已分析，语义/application coverage 仍是 partial                                                                |
| 当前测试制品身份可回读                                    | 已完成当前 Pod 回读      | `p0-runtime-evidence.md`、`p0-baseline-evidence.md`；Pod imageID 为 `sha256:04650b...`，当前 tree 为 `1e499d92`，rollout read-only 检查成功；外部镜像与旧源码 provenance 仍缺                                                                                         |
| 131 菜单、直达、刷新、返回、Tab、Network 和错误态         | 代表性补充完成           | `p0-runtime-evidence.md`、[`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)、[针对性风险关闭矩阵](./p0-risk-closure-matrix.md)；本轮补充 cluster、workspace DevOps、platform、extension 入口和一次打开/取消 Action；联邦、低权限和全量入口仍未覆盖 |
| 当前启用扩展清单                                          | 状态已核对，错误态未闭环 | 只读 API 列出 15 个 `Installed`、1 个 `InstallFailed`；本轮打开扩展管理和 `frontend-forge` 详情均为 `200`，同时稳定重现多个 `getExtensionConsoleV3Embed`/`ConfigConstants` 初始化错误，不能写成扩展行为已通过                                                         |
| 独立人工/其他复核                                         | 未完成                   | 当前执行模式已停止 Multi-Agent；本会话的静态核验不能替代原本需要独立完成的复核，仍需指定复核人确认                                                                                                                                                                    |
| 门禁签署                                                  | 未完成                   | 复核人、日期和结论待项目负责人或指定复核人填写                                                                                                                                                                                                                        |

## 2. 高风险未知项

| ID      | 当前状态 | 进入下一阶段前的关闭动作                                                                                                                                                      |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-U001 | 分析中   | 候选源码 commit、版本和许可证已固定；仍需构建元数据证明它对应当前制品，或由负责人确认“仅制品分析”边界                                                                         |
| P0-U002 | 分析中   | 已补齐静态调用点、Action 参数、Wujie 实例和重点 Chunk 字符串；本轮补充 workspace DevOps 打开/取消 Action 和扩展错误态；仍需逐项关联所有启用入口、权限、Network 和 V4 替代实现 |
| P0-U003 | 分析中   | 本轮补充 cluster、workspace、platform、extension 代表性入口和 Network；联邦 fixture、低权限账号、全量入口和错误态闭环仍缺                                                     |
| P0-U004 | 分析中   | 当前镜像 tag/digest、Pod imageID 和 `v3dist` tree 已固定；仍需补齐当前 2025 外部镜像输入与旧源码来源的可核验链路，不能复用 2026 另一代 tree 的 provenance                     |

本轮针对性矩阵已将 cluster、workspace、project、federated、platform、extension 六类作用域，以及 11 个业务 `useV3action` 调用和 3 个桥接文件逐项登记。矩阵结论是“静态路径已定位、运行时全量未关闭”，没有把 UI 菜单权限判断当作 API RBAC 证明。本轮运行时补充见 [`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)。

## 3. 结论

当前结论为 **P0-REA 分析中，待负责人复核**。证据包已经可以交给复核人，但高风险未知项和独立复核没有完成，不能创建或启动 P1/P2 正式开发任务，不能把 ConfigMap、Secret、ServiceAccount 的历史实现当作本轮 P2-REA 完成。

本轮风险核验起点为 `feature/v4-configmaps-secrets` / `3f19924fc`，相对 `feature/v4-migration` / `3e09afd6a` 有 63 个本地提交；本轮文档提交后本地 HEAD 已产生新的文档 SHA。GitHub 核验快照（本轮文档提交前）显示 Draft PR #1 的 head 为 `aea9806eb`，目标分支为 `feature/v4-migration`，共 67 个提交、25 个变更文件；其中包含 ConfigMap/Secret 代码和测试，以及 ServiceAccount、P0 审计等文档。提交本轮文档后，最终远程 head 和提交计数应以本地 `git rev-parse HEAD` 与 GitHub 回读结果为准；继续保持 Draft、暂不合并；如需提交，应先拆分资源实现与 P0 证据，或由负责人明确接受混合 PR，且不强推、不改写历史。

复核人确认栏：

| 项目           | 待填写                         |
| -------------- | ------------------------------ |
| 复核人         |                                |
| 复核日期       |                                |
| 门禁结论       | `待复核` / `已通过` / `不通过` |
| 备注和附加证据 |                                |

## 4. 历史双 Explorer 并行复核记录

2026-10-17 按双 Explorer 规则启动一批两个只读任务。历史返回摘要曾写成 10 个业务调用文件；随后由当前 Codex 顺序复核确认实际为 11 个业务调用文件和 3 个桥接实现/导出文件。该结果补充了 Action 静态库存的复核范围，但没有关闭 P0-U002。

P0-Baseline Explorer 未能完成取证，协作服务返回原始错误：`429 Too Many Requests`，request id `c9980dfe-945b-4033-a789-63ec10b87ba0`。按项目规则未进行重试或追加 Agent；P0-U001/P0-U004 继续保持“分析中”。本批没有产生新的代码或证据提交，门禁结论仍为“待项目负责人或指定复核人确认，不能进入下一阶段”。

## 5. 单会话顺序取证汇总

停止 Multi-Agent 后，协调 Codex 按“完成一个任务、验证并提交，再处理下一任务”的顺序完成了三项补充：

| 顺序 | Worktree/分支                                    | 提交                                       | 实际结果                                                                                       |
| ---- | ------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1    | `console-p0-baseline` / `feature/v4-p0-baseline` | `be20bc7a3ba7078754ad86ef16d29986f6e4f229` | 固定 `release-3.4` 的 commit、版本、许可证和当前 `v3dist` 更新提交；当前制品 provenance 未关闭 |
| 2    | `console-p0-audit` / `feature/v4-p0-audit`       | `5fc90ebf5ec5fe9469cac81afee661b01bc05369` | 补齐 11 个业务 `useV3action` 调用点、参数、作用域和旧源码/制品字符串对照；运行时映射未关闭     |
| 3    | `console-p0-rea` / `feature/v4-p0-rea`           | `8c6f59e697f2c0219a8e87afa75e2c47cfc8f89f` | 以同一制品 SHA 执行 7 个重点 Chunk 的 focused REA；Evidence `ev_1499...`，coverage 仍 partial  |

三项补充均为证据和文档变更，没有修改功能代码、稳定分支或部署环境。它们不能替代指定复核人对 P0 门禁的确认。
