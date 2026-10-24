# Workload 分支 REA 分析索引

> **2026-10-24 入口与制品状态校准**：历史运行时 REA 中“StatefulSet、DaemonSet 的编辑设置仍打开 YAML”只适用于当时的旧制品快照。当前源码提交 `31b6d88fc7e8` 的制品已在 131 Ready；已有认证态复验确认三类入口均打开原生 `WorkloadSettingsModal`，YAML 是独立 Action，并完成终止宽限期 `30 → 31 → 30` 保存与 API 回读。零 Cookie 新 context 登录仍失败，完整字段、RBAC、缓存、错误和逐项 V3 等价仍未闭环。详见[当前制品原生设置证据](./evidence/workload-native-settings-current-head-20261024.json)。

> 当前状态以 [module-execution.json](./module-execution.json) 为准。
> 本索引属于 `feature/v4-workloads`，不复制或覆盖 ConfigMap/Secret 分支的全局 P0 证据。历史全局索引保留在 `feature/v4-configmaps-secrets:docs/v4-migration/rea-analysis-summary.md`；需要输入时按固定 SHA 读取，不能继承其通过结论。

| 项目              | 当前事实                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 模块/当前能力     | Workload / Deployment、StatefulSet、DaemonSet 组合批次                                                                                                                                                                                                                   |
| Worktree/分支     | `console-workloads` / `feature/v4-workloads`                                                                                                                                                                                                                             |
| 当前阶段/REA 结论 | `DEV` / REA 已通过（项目负责人已批准进入 DEV；未闭环项转入 DEV/VERIFY 验收清单）                                                                                                                                                                                         |
| 事实输入提交      | 本轮制品定位 `e67b95ccdfd0b0b98d3e83de393fbfbcd4e172a0`；已验证镜像提交 `ef3b4f1a8`；业务代码输入以当前分支 HEAD 为准                                                                                                                                                    |
| 观察              | 已有原生简化表单和有限部署后测试；当前 V3 编辑行为尚未逐项还原                                                                                                                                                                                                           |
| 推断              | 表单覆盖不足，不能凭现有 V4 测试证明当前 V3 等价；具体缺失须由制品和真实 V3 行为确认                                                                                                                                                                                     |
| 制品/REA 证据     | [REA 复核及完整 Evidence ID](./workload-settings-rea-20261022.md)；[Action/API/权限与缓存静态证据](./workload-action-api-rbac-evidence-20261023.md)；[旧 V3 运行时补证](./workload-v3-runtime-rea-20261023.md)；V3 Git tree 绑定在阶段记录中，不能与 REA 目录摘要混用    |
| 行为和字段清单    | [组合能力边界](./workload-kind-capability-matrix.md)、[编辑设置能力矩阵](./deployment-settings-capability-matrix.md)、[旧源码对照](./workload-settings-source-evidence-20261024.md)；三类资源均未标记为已还原、[字段级对照](./workload-v3-field-equivalence-20261023.md) |
| 未知及影响        | 原生入口和配置引用桥接移除已完成 DEV；当前浏览器发现引用面板低权限控件暴露，退回 DEV 修复。完整权限/namespace/缓存与功能等价继续 VERIFY，不重做全量 REA。                                                                                                                |
| 关闭条件          | 公共行为和三类资源差异均有可追溯制品定位、运行时对照、V4 替代与差异；所有高风险已关闭或经复核明确隔离                                                                                                                                                                    |
| 复核人/日期/依据  | 项目负责人（用户明确批准）/ 2026-10-23 / [Workload REA 复核结论](./workload-rea-review-20261023.md#5-门禁动作)                                                                                                                                                           |
| 下一步            | 优先对照当前 v3dist 和真实设置页补齐分区、镜像认证、GPU、环境引用和端口语义；配置引用权限缺陷保留，修复后完成新 SHA 部署与浏览器验收。                                                                                                                                   |

REA 的 `partial/no-match` 是覆盖限制，不能证明功能不存在，也不是所有模块必须停止的理由。当前受限的是尚未证明的 Workload 组合批次；无关模块仍遵循自己的证据和门禁。无需恢复全部原始 TSX，只需要公共行为和三类资源差异的证据足以指导完整 V4 重构。

2026-10-23 安全上下文增量继续使用同一固定当前制品 tree，定向分析工厂 1540、1541、2276、2277、2282、2298，确认容器访问控制、UID/GID、SELinux、capabilities 及 Pod 用户/组与 SELinux 的字段边界。分析 Evidence 与局限见 [DEV 记录](./workload-settings-dev-20261023.md#安全上下文原生编辑增量2026-10-23)；该增量用于指导提交 `9e2f4148f`，不改变既有 REA 批准范围，也不替代当前制品 VERIFY。

2026-10-23 Pod 模板注解增量使用同一固定当前制品 tree，定向分析工厂 2306，确认容器设置元数据分区只编辑 `spec.template.metadata.annotations`，使用 `preservedAnnotations` 隐藏保留项。该证据指导提交 `4f2b5fac9`；workload 顶层 labels/annotations 属于另一个旧入口，仍是 DEV 缺口。证据与覆盖限制见 [REA 摘要](./evidence/workload-metadata-20261023-rea-summary.json)。

## 组合开发边界

Deployment、StatefulSet、DaemonSet 共用一个模块分支和组合能力记录，目的是复用列表、详情、容器/模板编辑、Store、缓存和权限底座。REA、DEV、VERIFY 仍按资源类型展开：Deployment 的结果不能替代 StatefulSet 或 DaemonSet，StatefulSet/DaemonSet 的特殊字段和 Action 不能被公共表单默认覆盖。具体边界和验收拆分见[组合能力边界矩阵](./workload-kind-capability-matrix.md)。

## 历史输入索引（均非当前放行）

- [Deployment 静态入口/API/Store 记录](./deployment-v3-evidence.md)：历史源码输入，不能独自证明当前制品行为。
- [缺口矩阵](./deployment-gap-matrix.md)：整体功能清单，编辑设置的详细清单从中链接。
- [编辑设置有限 VERIFY](./deployment-settings-verify-20261022.md)：保留各自 SHA/镜像和已执行场景，不能作为完整等价或当前阶段通过。
- [运行时 REA](./workload-runtime-rea-20261023.md)：记录 131 当前部署制品的页面形态；Deployment 可打开原生设置，StatefulSet/DaemonSet 仍打开 YAML。该制品不是当前分支 SHA，不能作为当前 VERIFY。
- [Workload 首轮 VERIFY](./workload-131-verify-20261022.md)：保留列表、详情等历史观察，不倒推编辑设置 REA。

全局 P0-U001～U004 继续跟踪。本索引没有关闭或豁免全局风险，也没有签署模块通过。

2026-10-23 定向取证已定位普通三类资源的编辑 Action、处理器和按资源登记的分区，并确认 STS/DS 的 V4 编辑设置仍调用 YAML；详见[组合矩阵中的实际制品记录](./workload-kind-capability-matrix.md#2026-10-23-定向制品证据普通资源编辑入口与分区)。这是静态事实，字段、API、权限和运行时仍未闭环。旧 Evidence ID 不在当前 REA 会话中，原始错误已保留；本轮新证据保留摘要、可重建偏移清单和本机完整归档，不冒充旧分析已恢复。

2026-10-23 策略专项补证输入 `45f104b6e18215bb6b4f273e1dd16da30107188a`：当前制品三个工厂完成惰性提取和实际 REA，三类旧 V3 更新策略生成的 PUT 已在浏览器拦截，模拟 409 后取消，API 回读无变化。已区分已有值与缺省值、Deployment 数字转换与 DaemonSet 字符串，以及 StatefulSet 初始化拼写和 DaemonSet 默认不一致。详见[字段补证](./workload-v3-field-equivalence-20261023.md#当前编译制品的策略调度及优雅终止补证)、[来源偏移](./evidence/workload-strategy-20261023-provenance.json)、[REA 摘要](./evidence/workload-strategy-20261023-rea-summary.json)及[运行时摘录](./evidence/workload-strategy-20261023-runtime.json)。这不是实际服务端冲突/持久化测试，不晋级当前阶段。

2026-10-23 UI 分区复核：只读遍历旧 V3 Deployment、StatefulSet、DaemonSet 设置弹窗的所有已挂载分区，确认更新策略、容器/容器组、普通卷、调度和终止分区的资源差异；结果见[结构化快照](./evidence/workload-settings-ui-20261023.json)。同时补齐当前 V4 Store/API/Action 静态矩阵，明确 DaemonSet 停止误用 `spec.replicas=0`、StatefulSet Service/PVC 模板及缓存失效仍待 DEV/VERIFY 处理。该条属于历史取证记录；当前 REA 已获负责人批准进入 DEV。

2026-10-23 REA 材料复核结论见[Workload 组合批次 REA 复核结论](./workload-rea-review-20261023.md)：项目负责人已批准进入 DEV，批准范围是按已确认缺口开始编码；配置引用的 V3 Action/Wujie 依赖、集群级 Workload 列表的 Wujie/V3 主入口、字段/校验、RBAC/作用域、缓存/错误和三类资源逐项等价均转为 DEV/VERIFY 验收清单，不得在 DEV 中直接视为已完成。

2026-10-23 字段行为矩阵见[Workload 三类资源字段行为矩阵](./workload-field-behavior-matrix-20261023.md)：逐项绑定旧 V3 的字段分区、默认值/校验、当前 V4 解析与写回逻辑，单独列出 StatefulSet 的 Service/PVC 模板和 DaemonSet 的无副本/更新策略差异。该矩阵把“已定位事实”和“待实测行为”分开，扩大 DEV 输入但不关闭高风险项。

2026-10-23 Action/API/权限补证见[静态证据矩阵](./workload-action-api-rbac-evidence-20261023.md)：确认三类详情页的权限键、操作差异、请求方法和作用域构造，明确 DaemonSet 停止语义、集群级 Wujie/V3 列表、配置引用桥接以及按资源类型失效缓存的限制。该补证作为 DEV 实现输入，当前 SHA 的运行时 RBAC、隔离、缓存和错误态证据仍需在 DEV/VERIFY 阶段完成。

2026-10-23 REA 阶段测试见[测试证据](./workload-rea-test-evidence-20261023.md)：`./scripts/test.sh` 的 70 个测试文件、287 个断言全部通过；另有 15 个 Workload 定向测试文件、106 个断言通过。测试覆盖当前源码的解析、Store、权限参数、错误传播和 V3 桥接协作；不覆盖当前 SHA 构建部署后的浏览器、真实 RBAC、跨 namespace 隔离或完整三类资源等价，因此不改变 REA 门禁。

2026-10-23 旧 V3 运行时补证见[运行时记录](./workload-v3-runtime-rea-20261023.md)：在固定历史镜像 `feature-v4-workloads-20261022-215739-27aaeced74e8` 上只读观察 Deployment、StatefulSet、DaemonSet 设置弹窗和 GET 请求，确认资源特有分区及字段。该镜像不是当前分支 HEAD，证据用于校准 V3 行为，不作为当前 VERIFY；当前 SHA 的构建、部署和 Playwright 验收仍待执行。

2026-10-23 调度定向补证使用当前 `v3dist` 工厂 1530/2440/2583，确认 Deployment/StatefulSet 的默认、分散、聚合、自定义 Pod 调度结构，以及非联邦创建路径 `spec.template.spec.nodeSelector`；旧 V3 UI 快照同时确认 DaemonSet 不显示该调度分区。来源、偏移、工厂哈希和 REA 限制见[来源记录](./evidence/workload-scheduling-20261023-provenance.json)与[摘要](./evidence/workload-scheduling-20261023-rea-summary.json)。该证据只指导提交 `7db1a9353` 的 DEV 实现，不证明运行时调度、RBAC 或浏览器等价；无法安全建模的 affinity 保留原对象，tolerations 继续列为未知。

同时纠正集群列表判定：活跃入口是 V4 Banner/Tab + Wujie 内 V3 列表；独立 STS/DS Embed 文件的 URL 互换没有在该主入口复现。当前阶段已获准进入 DEV；当前 SHA 的最终构建部署验收属于 VERIFY，不能用历史镜像证据替代。

2026-10-23 DEV 首批代码提交 `0c1d9aadf`：STS/DS 原生设置入口、三类更新策略、优雅终止和 STS PVC 挂载校验已经实现；当前 72 文件/304 项回归通过，未进行当前 SHA 镜像部署或浏览器验收。完整字段、集群原生入口、配置引用、权限/作用域/缓存等仍按原清单推进。见 [DEV 实际记录](./workload-settings-dev-20261023.md)。

2026-10-23 生命周期 DEV 增量 `da25187d3`：用当前制品工厂 1536/2257/2287 的定向 REA 确认动作模型，复用原生控件补齐三类设置。73 文件/314 项回归通过，131 服务端 dry-run 确认三类请求及普通 init/sidecar 差异；不是部署后 VERIFY，未关闭完整字段、RBAC、作用域及配置引用等清单。详见 [DEV 增量](./workload-settings-dev-20261023.md#生命周期原生编辑增量2026-10-23)及 [REA 摘要](./evidence/workload-lifecycle-20261023-rea-summary.json)。

2026-10-23 workload 顶层元数据定向补证使用固定当前制品的工厂 2439 与 main 工厂 52，确认创建高级设置分别处理顶层 labels/annotations、同 cluster/namespace 标签重复检查，以及 labels 向 `metadata.labels`、`spec.selector.matchLabels`、`spec.template.metadata.labels` 的同步。来源、偏移、Bundle/工厂哈希见[来源记录](./evidence/workload-top-metadata-20261023-provenance.json)，实际 REA Evidence 与限制见[摘要](./evidence/workload-top-metadata-20261023-rea-summary.json)。该证据指导提交 `86ce8b4ab` 的 Deployment 创建实现；StatefulSet/DaemonSet 创建和已有资源顶层元数据编辑仍在 DEV 清单，运行时保存/RBAC/页面行为留待 VERIFY。

2026-10-23 宿主时区定向补证使用固定当前制品工厂 933/2285，确认容器开关写入 `host-time:/etc/localtime` 只读挂载，并在普通/初始化容器合并后维护 `/etc/localtime` HostPath 卷。来源、偏移及工厂哈希见[来源记录](./evidence/workload-timezone-20261023-provenance.json)，实际 REA Evidence 与限制见[摘要](./evidence/workload-timezone-20261023-rea-summary.json)。该证据指导提交 `da741a389` 的三类设置及 Deployment 创建实现；页面渲染、实际 Pod 时区、RBAC 和持久化留待 VERIFY。

2026-10-23 停止语义定向补证定位当前制品 main 工厂 318：DaemonSet 使用 `nodeSelector.non-existing=true`，其他 Workload 使用 `replicas=0`。来源见[记录](./evidence/workload-stop-20261023-provenance.json)，REA Evidence 与限制见[摘要](./evidence/workload-stop-20261023-rea-summary.json)；指导提交 `da741a389`，真实停止/恢复留待 VERIFY。
