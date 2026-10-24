# Workload 组合开发能力边界矩阵

> **2026-10-24 状态校准**：本文保留组合批次的 REA 防遗漏矩阵；其中历史段落的“阶段：REA”“REA 未完成”只表示该段记录生成时的状态，不是当前门禁状态。当前阶段以 `module-execution.json` 为准：REA 已通过、DEV 已完成、VERIFY 未完成。当前制品的原生设置入口和终止宽限期保存回读已有 131 证据，但完整字段、权限、缓存、错误和逐项 V3 等价仍待验证。

> **入口描述校准（2026-10-24）**：本文后续历史段落中的“StatefulSet、DaemonSet 编辑设置仍调用 `editYaml`”是 2026-10-23 旧制品 REA 快照。当前分支源码和 131 旧精确制品复验均显示两个资源的 `editConfigTemplate` 打开原生 `WorkloadSettingsModal`，YAML 由独立 `editYaml` Action 提供。当前 HEAD 新制品尚未在 131 Ready，完整设置字段、保存、权限和 V3 等价仍未验收；详见[旧制品原生设置证据](./evidence/workload-native-settings-old-artifact-20261024.json)。

> 当前模块：`workloads`；当前能力：`deployment-statefulset-daemonset`；阶段：`REA`；状态：分析中。
>
> 分支：`feature/v4-workloads`；Worktree：`console-workloads`；当前范围：Deployment、StatefulSet、DaemonSet。

## 组合方式

三类资源放在同一模块批次开发，目的是复用列表、详情、容器/模板表单、Store、缓存、作用域和权限底座。组合开发只减少重复实现，不合并行为证据：每个公共能力和每个资源差异都要有单独的 REA 记录、测试场景和验收结论。

当前仍处于 REA。本文是范围和防遗漏矩阵，不表示任何资源已经通过 REA、DEV 或 VERIFY。历史代码、旧镜像和旧浏览器结果只能作为输入，不能直接继承为当前组合批次的通过结果。

下列字段均是待核对候选，必须记录当前 V3 是否提供入口、展示、编辑或只读行为。不能将 Kubernetes API 支持的字段直接算作 V3 已有 UI 功能；不可变字段、版本不支持项和不适用操作需要证据及原因，不能默认开放编辑。Pod、Job、CronJob 仍归 Workload 模块的后续批次，不在本轮范围内。

## 公共能力与资源差异

| 能力范围                             | 公共实现候选                                | Deployment                           | StatefulSet                                     | DaemonSet                                | 当前证据状态 |
| ------------------------------------ | ------------------------------------------- | ------------------------------------ | ----------------------------------------------- | ---------------------------------------- | ------------ |
| 列表、搜索、排序、分页、刷新         | `ListPage`、Workload Store、React Query key | 项目 Deployment 列表                 | 需确认项目 StatefulSet 列表字段和筛选           | 需确认项目 DaemonSet 列表字段和筛选      | REA 未完成   |
| 列表到详情、直达、刷新、返回         | 原生路由、详情布局、Tab 状态                | 详情 Tab 和版本记录                  | 详情 Tab、版本/更新语义需单独确认               | 详情 Tab、节点/更新语义需单独确认        | REA 未完成   |
| 容器、环境变量、探针、资源、卷和挂载 | `WorkloadSettingsModal` 及表单输入          | 以 `DS-*` 条目展开                   | 以 `STS-*` 条目补充持久化和更新差异             | 以 `DAEMON-*` 条目补充调度和更新差异     | REA 未完成   |
| YAML、元数据、事件、配置引用         | 共享 Action、详情组件、Mutation             | 需确认 selector、HPA 和 rollout 约束 | 需确认 volumeClaimTemplates、更新策略和配置引用 | 需确认节点调度和配置引用                 | REA 未完成   |
| 伸缩、回滚、重启、删除               | 共享 Action 入口和错误反馈框架              | 伸缩、Revision、rollout、HPA 清理    | 伸缩/回滚语义需按 StatefulSet 证据确认          | DaemonSet 不得套用 Deployment 副本数伸缩 | REA 未完成   |
| RBAC、作用域、缓存、错误和取消       | 共享 query key、权限判断和反馈组件          | project/namespace/联邦差异           | project/namespace/联邦差异                      | project/namespace/联邦差异及节点约束     | REA 未完成   |

## 资源类型独立清单

### Deployment（`DS-*`）

Deployment 详细候选字段和行为见[编辑设置能力矩阵](./deployment-settings-capability-matrix.md)。其中 `DS-*` 表示 Deployment Settings，不表示 DaemonSet。需要继续核对：更新/滚动策略、HPA、Revision、rollout、配置引用和所有动态 Action。

### StatefulSet（`STS-*`）

至少单独核对：serviceName、podManagementPolicy、updateStrategy、partition、volumeClaimTemplates、稳定网络标识、持久化卷、滚动更新/回滚、伸缩限制、配置引用、RBAC、错误和缓存失效。仅复用 Deployment 表单不能证明这些行为等价。

### DaemonSet（`DAEMON-*`）

至少单独核对：节点选择、节点亲和性、污点容忍、updateStrategy、maxUnavailable、maxSurge、节点数量变化、滚动更新/回滚、重启、删除、配置引用、RBAC、错误和缓存失效。DaemonSet 不使用 Deployment 的 replicas 伸缩假设。

## 进入 DEV 和完成验收的规则

1. 先完成三类资源的组合 REA，公共能力和资源差异均需绑定制品、旧源码参考或真实运行时证据。
2. 公共代码可以在同一提交中实现，但提交说明和文档必须列出三类资源的调用方、差异和回归范围。
3. 测试可以共用测试工具，但测试用例必须按 Deployment、StatefulSet、DaemonSet 分组，不能用 Deployment 通过替代另外两类。
4. 同一镜像可以执行三类资源的 VERIFY，但必须分别记录 rollout、页面渲染、API、RBAC、namespace 隔离、缓存、错误和 V3 等价结果。
5. 任一资源存在影响正确性、安全性或数据保留的高风险未知项时，该资源不能标记通过；组合 PR 不能把它隐藏在公共实现中。
6. 只有三类资源的必要条件全部满足，组合批次才可进入 PR 复核；此前保持 Draft。

## 当前缺口

- Deployment 现有 22 类编辑设置清单仍未完成 V3 逐项核对。
- StatefulSet、DaemonSet 的独立 V3 入口、字段、Action/API/Store 和资源差异矩阵尚未形成。
- 三类资源的完整 RBAC、作用域、缓存、错误/取消和真实部署后浏览器证据尚未闭环。
- 本文不授权业务代码修改、部署或把历史 VERIFY 记录改成当前通过；下一步仍为组合 REA 取证。

## 2026-10-23 定向制品证据：普通资源编辑入口与分区

输入提交 `e67b95ccdfd0b0b98d3e83de393fbfbcd4e172a0`；V3 tree 未变。通过惰性 AST 定位当前编译制品的 Webpack 工厂，提取 13 个工厂供 REA 静态分析，未执行制品。数字模块 ID 只用于本制品定位，不视为跨版本标识或原始源码。

[偏移及摘要清单](./evidence/workload-edit-factories-20261023-provenance.json)记录原 bundle SHA-256、UTF-16/UTF-8 字节范围、工厂摘要和括号包装规则；[REA 原始摘要](./evidence/workload-edit-factories-20261023-summary.json)保留完整限制。父 Evidence：`ev_89e567e2ff36e72e827b17a09891d2400e902abafca83aab123de5e1585b2906`。13 个 JavaScript 文件均解析成功，无解析失败；此派生输入的 application=complete 只表示选定输入已遍历，semantic=unknown、2940 semantic unknowns，不代表 Workload 行为完整。

### 普通与联邦入口必须区分

此前重点 bundle `8.efefc7072f02199ebc47.js` 中的相关候选主要调用 `federated.workload.template.edit`，不能单独证明普通项目编辑设置。普通三类资源的当前详情入口实际位于 `1.9ca3a76d71946712055c.js`：

| 资源        | 工厂及 UTF-16 范围（左闭右开） | 静态可见调用                                                                                                                  | V4 对照及未闭环项                                                                                            |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Deployment  | `1216`，`[813525, 819978)`     | `workload.template.edit`，传 detail、match.params、success、rootStore、supportGpuSelect=true；另有回滚、HPA、YAML、重启、删除 | V4 详情已开原生设置 Modal，但完整分区和字段未等价                                                            |
| DaemonSet   | `1221`，`[830800, 835605)`     | 同名编辑 Action，另有回滚、YAML、重启、删除                                                                                   | V4 `DaemonSets/Detail/index.tsx` 的 editConfigTemplate 仍调用 editYaml，与独立设置入口不等价                 |
| StatefulSet | `1402`，`[1084253, 1090851)`   | 同名编辑 Action，另有回滚、HPA、`workload.service.edit`、YAML、重启、删除                                                     | V4 `StatefulSets/Detail/index.tsx` 的 editConfigTemplate 仍调用 editYaml；Service 编辑还需核对请求及错误路径 |

上述 Action 名称仅说明当前工厂内存在调用，不证明每种账号、集群、项目均可见或执行成功。路由字符串同时涉及 workspace 项目、cluster 和 EdgeWize 分支，仍须结合实际启用范围验证。

### 当前制品明确登记的编辑分区

`3.bb6cbee4309e765b70c1.js` 中 `3595 → 3601 → 3602` 分别是 Action 处理器、设置 Modal、按资源选表单的配置；详见摘要清单中的范围。`3601` 取 `forms[module]` 并过滤 disabled 条目，`3602` 登记以下分区：

| 资源        | 分区顺序（编译制品中的名称）                                                       | 差异                                                                               |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Deployment  | updateStrategy → podTemplate → volumeSettings → deploymentMode → podMode → ippools | 编辑入口传 supportGpuSelect=true；实际 GPU 字段尚未展开                            |
| StatefulSet | updateStrategy → podTemplate → podMode → volumeSettings → deploymentMode → ippools | Action 传 hideVolumeSetting=true；不能据此推断整个卷分区隐藏，须追踪子组件及运行时 |
| DaemonSet   | updateStrategy → podTemplate → volumeSettings → podMode → ippools                  | 该表没有 deploymentMode 分区；不能据此推断全部调度字段不存在                       |

ippools 的 disabled 条件为 `!globals.app.hasKSModule("network")`，不是无条件展示。podMode 标题是 POD_GRACE_PERIOD；卷、容器、更新策略、调度和宽限期分别继续委托 `1682/1680/1681/1679/1683` 等组件，其下层字段与校验仍需展开，不能只依据分区名实现。

Action `3595` 从 `detail._originData` 取编辑对象，保存时处理 `spec.template.spec.customMode` 后执行 `store.update(detail, data)`；Promise 成功后关闭 Modal 并调用 success。实际 HTTP 方法、payload 转换、错误传播、权限及缓存刷新仍需追踪 Store 和浏览器，不能从此调用推定已验证。`1122` 共享 Modal 进一步委托 `2925` 表单容器，字段、校验和取消行为尚未闭环。

### 旧源码与当前实现的补充对照

固定 `origin/release-3.4` 确认三类资源均有基础信息、Pod、存储和高级四个设置分区；StatefulSet 额外启用 Service 设置。旧源码还确认 Deployment 有 HPA 编辑入口，StatefulSet 有 Service 编辑入口，三类资源共用模板编辑、回滚、重建、YAML 和删除入口。完整对照见[旧源码与当前实现对照](./workload-settings-source-evidence-20261024.md)。这些事实与当前制品事实相互印证资源差异，但不能证明当前制品的完整字段和运行时行为已经恢复。

### 本轮结论和下一项

已补齐普通三类资源的静态编辑入口、Action 处理器和分区登记定位，并确认 V4 的 STS/DS 编辑设置仍误用 YAML。尚未完成字段、校验、Store/API、RBAC、真实页面与请求的逐项核对；覆盖维度保持“未完成”，不签署 REA 或 VERIFY 通过。下一项沿已定位的表单子组件和 Store 做定向展开，再用真实 V3 页面/Network 校准，不重复全量 REA，不依据旧 release-3.4 直接编码。

### 2026-10-23 Store/API 定向取证补充

已将当前 V4 的作用域 URL、Deployment 原生设置 PUT、其他 PATCH、Background 删除、关联 HPA 和 StatefulSet Service PATCH 绑定到源码行号；同时确认三类 Workload 的查询 key 虽包含资源类型和 cluster/namespace/name，但当前 Store 未形成统一的 mutation 后缓存失效机制。旧源码的编辑设置为 GET resourceVersion 后 PUT 完整对象，DaemonSet 停止路径使用不可调度 nodeSelector；当前 V4 的 Deployment 设置已是原始快照 PUT，而停止逻辑仍固定写入 `spec.replicas=0`，这两个资源差异都必须用真实 API 和浏览器证据关闭。

本轮结论仍为 REA 未完成：静态请求边界已定位，浏览器已确认三类详情页和 STS/DS 的 YAML 缺口，但真实 Network、完整 payload、RBAC 正反权限、缓存失效、错误/取消 UI、namespace 隔离和当前 SHA 部署后的页面渲染尚未验证。详见[Store/API 取证](./workload-settings-source-evidence-20261024.md#storeapi作用域和缓存的定向取证2026-10-23)和[运行时 REA](./workload-runtime-rea-20261023.md)。

补充边界：当前 `3.bb6cbee4309e765b70c1.js` 的普通设置注册和集群差异设置注册不是同一能力。普通设置注册 `3602` 已包含 DaemonSet，集群差异注册也包含 DaemonSet；两者的入口、参数和字段差异仍需分别核对，不能把任一注册结果直接当成普通项目 DaemonSet 的完整等价证明。当前 131 浏览器观察已确认普通项目 DaemonSet 的“编辑设置”仍打开 YAML。
