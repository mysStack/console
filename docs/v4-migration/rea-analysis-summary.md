# Workload 分支 REA 分析索引

> 当前状态以 [module-execution.json](./module-execution.json) 为准。
> 本索引属于 `feature/v4-workloads`，不复制或覆盖 ConfigMap/Secret 分支的全局 P0 证据。历史全局索引保留在 `feature/v4-configmaps-secrets:docs/v4-migration/rea-analysis-summary.md`；需要输入时按固定 SHA 读取，不能继承其通过结论。

| 项目              | 当前事实                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 模块/当前能力     | Workload / Deployment、StatefulSet、DaemonSet 组合批次                                                                                                                |
| Worktree/分支     | `console-workloads` / `feature/v4-workloads`                                                                                                                          |
| 当前阶段/REA 结论 | `REA` / 分析中                                                                                                                                                        |
| 事实输入提交      | 本轮制品定位 `e67b95ccdfd0b0b98d3e83de393fbfbcd4e172a0`；历史复核 `87df0e024ea93333a2352fc92907007b86f5e33b`；业务代码输入 `36ae2216167ae27561c05e37e5157df0da322de8` |
| 观察              | 已有原生简化表单和有限部署后测试；当前 V3 编辑行为尚未逐项还原                                                                                                        |
| 推断              | 表单覆盖不足，不能凭现有 V4 测试证明当前 V3 等价；具体缺失须由制品和真实 V3 行为确认                                                                                  |
| 制品/REA 证据     | [REA 复核及完整 Evidence ID](./workload-settings-rea-20261022.md)；V3 Git tree 绑定在阶段记录中，不能与 REA 目录摘要混用                                              |
| 行为和字段清单    | [组合能力边界](./workload-kind-capability-matrix.md)、[编辑设置能力矩阵](./deployment-settings-capability-matrix.md)；三类资源均未标记为已还原                        |
| 未知及影响        | 三类资源的入口/分区、完整字段、Action/API/Store、RBAC/作用域、错误态和缓存尚未闭环，影响功能完整性、权限和数据保留                                                    |
| 关闭条件          | 公共行为和三类资源差异均有可追溯制品定位、运行时对照、V4 替代与差异；所有高风险已关闭或经复核明确隔离                                                                 |
| 复核人/日期/依据  | 尚无本能力正式签署，不填造；阶段记录中的 `review` 为 `null`                                                                                                           |
| 下一步            | 沿已定位表单子组件和 Store 展开字段/校验/API，再以真实 V3 页面校准；不重复全量 REA，不提前编码或部署                                                                  |

REA 的 `partial/no-match` 是覆盖限制，不能证明功能不存在，也不是所有模块必须停止的理由。当前受限的是尚未证明的 Workload 组合批次；无关模块仍遵循自己的证据和门禁。无需恢复全部原始 TSX，只需要公共行为和三类资源差异的证据足以指导完整 V4 重构。

## 组合开发边界

Deployment、StatefulSet、DaemonSet 共用一个模块分支和组合能力记录，目的是复用列表、详情、容器/模板编辑、Store、缓存和权限底座。REA、DEV、VERIFY 仍按资源类型展开：Deployment 的结果不能替代 StatefulSet 或 DaemonSet，StatefulSet/DaemonSet 的特殊字段和 Action 不能被公共表单默认覆盖。具体边界和验收拆分见[组合能力边界矩阵](./workload-kind-capability-matrix.md)。

## 历史输入索引（均非当前放行）

- [Deployment 静态入口/API/Store 记录](./deployment-v3-evidence.md)：历史源码输入，不能独自证明当前制品行为。
- [缺口矩阵](./deployment-gap-matrix.md)：整体功能清单，编辑设置的详细清单从中链接。
- [编辑设置有限 VERIFY](./deployment-settings-verify-20261022.md)：保留各自 SHA/镜像和已执行场景，不能作为完整等价或当前阶段通过。
- [Workload 首轮 VERIFY](./workload-131-verify-20261022.md)：保留列表、详情等历史观察，不倒推编辑设置 REA。

全局 P0-U001～U004 继续跟踪。本索引没有关闭或豁免全局风险，也没有签署模块通过。

2026-10-23 定向取证已定位普通三类资源的编辑 Action、处理器和按资源登记的分区，并确认 STS/DS 的 V4 编辑设置仍调用 YAML；详见[组合矩阵中的实际制品记录](./workload-kind-capability-matrix.md#2026-10-23-定向制品证据普通资源编辑入口与分区)。这是静态事实，字段、API、权限和运行时仍未闭环。旧 Evidence ID 不在当前 REA 会话中，原始错误已保留；本轮新证据保留摘要、可重建偏移清单和本机完整归档，不冒充旧分析已恢复。
