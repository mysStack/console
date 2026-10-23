# Workload 旧 V3 字段与当前 V4 能力对照（2026-10-23）

> 本文是 `feature/v4-workloads` 的字段级 REA 证据。它把固定旧源码、当前 V4 源码和已取得的运行时观察分开记录，不把旧源码存在直接当作当前 V4 已实现，也不把旧镜像结果当作当前 SHA 的 VERIFY。

## 取证边界

| 项目              | 取值                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| 当前 Worktree     | `/home/bruce/code/ks-develop/console-workloads`                                                |
| 当前分支          | `feature/v4-workloads`                                                                         |
| 本次记录对应 HEAD | `7913b61c6faa32701dadd960349e18d298101ae1`                                                     |
| 旧 V3 参考        | `origin/release-3.4`，固定提交 `175710fefeeba6ff295c2c0967b4d45b83563d26`                      |
| 当前 V4 设置入口  | `packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx` |
| 当前 V4 转换逻辑  | `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts`             |
| 当前阶段          | `REA / 分析中`                                                                                 |

旧 V3 分支不是当前 `v3dist` 构建来源证明。本记录只使用它确认历史页面分区、字段和资源差异；当前制品的入口和运行时形态以 `workload-settings-rea-20261022.md`、`workload-runtime-rea-20261023.md` 及制品证据为准。

## 字段与分区对照

| 能力组                     | 旧 V3 证据                                                                                                                                                        | 当前 V4 证据                                                                                                                         | Deployment   | StatefulSet                                               | DaemonSet                                               | REA 结论与后续动作                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 基本信息、名称和项目       | `src/components/Forms/Workload/ContainerSettings/index.jsx` 负责读取模板；旧基础信息入口另见 `src/components/Forms/Workload/BaseInfo/index.jsx`                   | `WorkloadSettingsModal.tsx:110-115` 只展示禁用的名称和项目；`deployment.ts:423-434` 解析名称、namespace、别名和描述                  | 部分         | 入口仍未接入                                              | 入口仍未接入                                            | 需要确认编辑时别名、描述、保留注解和不可变项目字段的展示、写回及清空语义                         |
| 副本数                     | `ContainerSettings/index.jsx:201` 从 `spec.replicas` 读取；旧渲染逻辑对 DaemonSet 不显示副本控件                                                                  | `WorkloadSettingsModal.tsx:116-118` 无资源类型判断，统一渲染副本输入；`deployment.ts:430,611` 统一读取/写入 `spec.replicas`          | 有限         | 不应直接继承 Deployment 语义，需单独确认 StatefulSet 伸缩 | 高风险：DaemonSet 不应提供 Deployment 式副本伸缩        | DEV 前必须按资源类型决定适用操作和 UI；不能把 DaemonSet 的显示存在写成支持伸缩                   |
| 容器、初始化容器           | 旧 `ContainerSettings/index.jsx:722-735` 渲染容器列表，`ContainerForm/index.jsx` 负责容器字段                                                                     | 当前 `WorkloadSettingsModal.tsx:120-156` 提供容器和初始化容器；`deployment.ts:361-387,452-565` 解析、校验并合并部分字段              | 部分         | 入口未接入                                                | 入口未接入                                              | 当前 V4 已有公共子集；需逐项补齐旧 V3 容器高级字段和清空/保留行为                                |
| 镜像、拉取策略、命令和参数 | `ContainerForm/ContainerSetting/index.jsx`、`Commands/index.jsx`、`ImagePullPolicy/index.jsx`                                                                     | `deployment.ts:437-449,639-644` 支持镜像、拉取策略、命令和参数                                                                       | 部分         | 未接入                                                    | 未接入                                                  | 需要分别验证三类资源的表单入口、payload 和原字段保留                                             |
| 端口、环境和配置引用       | `ContainerForm/Ports/index.jsx`、`Environments/index.jsx`、`ContainerForm/index.jsx`                                                                              | `deployment.ts:369-381,478-509` 支持端口、字面量环境、ConfigMap/Secret `envFrom`，并保留部分 `valueFrom`                             | 部分         | 未接入                                                    | 未接入                                                  | 需要验证引用删除、重复项、Service 端口关联和三类资源的回读                                       |
| 健康检查                   | `ContainerForm/HealthChecker/index.jsx`、`ProbeForm/*`                                                                                                            | `deployment.ts:334-358,382-384,549-561` 支持 HTTP/TCP/command 的部分探针字段                                                         | 部分         | 未接入                                                    | 未接入                                                  | 需要核对旧 V3 的默认值、字段清空、gRPC 或其他保留字段及错误反馈                                  |
| 生命周期、容器安全和时区   | 当前制品工厂 1536/2257/2287 与 1540/1541/2276/2277/2282 分别确认生命周期和安全上下文；旧源码补充时区入口                                                          | 原生容器输入已实现生命周期及 V3 容器安全字段，支持保留/修改/清空；时区挂载仍未实现                                                   | DEV 部分完成 | DEV 部分完成                                              | DEV 部分完成                                            | 生命周期和安全上下文待当前 SHA VERIFY；时区挂载继续作为 DEV 缺口                                 |
| Pod 安全上下文             | 当前制品工厂 2298 与旧源码均确认用户/组、SELinux 分区                                                                                                             | 原生设置已接入 `SecurityContextInput`，转换支持三类资源的保留、修改、清空及未知字段保留                                              | DEV 已实现   | DEV 已实现                                                | DEV 已实现                                              | 131 服务端 dry-run 已接受；当前 SHA 浏览器、真实持久化和权限错误路径仍待 VERIFY                  |
| 亲和性                     | `ContainerSettings/PodAffinity/index.jsx`、`Affinity/index.jsx`，由 `ContainerSettings/index.jsx:762-778` 渲染                                                    | 当前设置 Modal 没有对应字段；当前转换逻辑未解析 `affinity`                                                                           | 未完成       | 未接入                                                    | 未接入                                                  | 需要分别核对 node/pod affinity、反亲和性和容忍度的历史入口                                       |
| 终止宽限期                 | 当前制品与旧源码均确认 `spec.template.spec.terminationGracePeriodSeconds`，默认值 30，最小值 0                                                                    | 原生设置已实现三类资源回填和写回，显式 0 保留，未编辑值不重写                                                                        | DEV 已实现   | DEV 已实现                                                | DEV 已实现                                              | 当前 SHA 服务端持久化和浏览器回读仍待 VERIFY                                                     |
| 更新策略                   | 当前制品和旧源码确认 Deployment、StatefulSet、DaemonSet 的独立策略字段                                                                                            | 原生设置已按资源类型实现策略、数值/百分比校验及不适用字段清理                                                                        | DEV 已实现   | DEV 已实现                                                | DEV 已实现                                              | 当前 SHA 持久化、切换默认值和错误/取消路径仍待 VERIFY；旧 V3 拼写与默认值差异保留在证据中        |
| 节点调度                   | `AdvanceSettings/index.jsx:61-71` 对 DaemonSet 排除节点选择；`NodeSchedule/index.jsx:28-35` 写入 `spec.template.spec.nodeSelector`                                | 当前设置 Modal 没有节点调度字段                                                                                                      | 部分待核对   | 部分待核对                                                | 旧 V3 明确不提供该分区，但 DaemonSet 的调度语义仍需保留 | 需要确认当前 V4 是否有其他入口、DaemonSet 的节点约束和错误反馈，不得从“没有旧控件”推断可删除字段 |
| Pod IP 池                  | `AdvanceSettings/index.jsx:55-60` 在网络模块启用且非联邦入口时渲染 `PodIPRange`                                                                                   | 当前设置 Modal 没有对应字段                                                                                                          | 未完成       | 未完成                                                    | 未完成                                                  | 需要确认模块开关和当前 V4 替代；不能把集群能力直接加入普通表单                                   |
| Pod 模板元数据             | 当前制品工厂 2306 确认容器设置分区只编辑 `spec.template.metadata.annotations` 并隐藏保留注解；旧 `AdvanceSettings/Metadata` 另管 workload 顶层 labels/annotations | 三类原生设置及 Deployment 创建已接入 Pod 模板注解，支持回填、修改、清空和 qualified name 校验；模板 labels 保留                      | DEV 部分完成 | DEV 部分完成                                              | DEV 部分完成                                            | 当前 SHA 浏览器/持久化待 VERIFY；workload 顶层 labels/annotations 仍是独立 DEV 缺口              |
| StatefulSet Service        | `ContainerSettings/index.jsx:175-198,453-515` 初始化 Service、同步端口/selector，并对 StatefulSet 设置 `clusterIP=None`；StatefulSet 通过 `withService` 进入      | 当前设置 Modal 没有 Service 区域；已有 `useWorkloadService.tsx` / Service Store 是独立静态入口                                       | 不适用       | 未完成                                                    | 不适用                                                  | 必须单独设计 StatefulSet Service 编辑和保存、Headless 行为，不能由普通 Workload 表单替代         |
| StatefulSet 卷模板         | `VolumeSettings/index.jsx:333-354,524-676` 维护 `spec.volumeClaimTemplates`，并有专用添加/编辑组件                                                                | `deployment.ts:423-434` 只读取 `spec.template.spec.volumes`；`buildDeploymentSettingsResource:597-612` 不处理 `volumeClaimTemplates` | 不适用       | 未完成                                                    | 不适用                                                  | 这是 StatefulSet 必须补齐的资源差异；需要确认不可变字段、PVC 模板和挂载关联的写回/错误语义       |
| 卷、挂载和配置卷           | 旧 `VolumeSettings/index.jsx` 管理 PVC、临时卷、HostPath、ConfigMap/Secret、挂载和日志相关注解                                                                    | `WorkloadSettingsModal.tsx:158-173` 提供普通卷；`deployment.ts:390-420,567-589` 支持有限来源并保留未知来源                           | 部分         | 仅普通卷子集                                              | 仅普通卷子集                                            | 需要分别验证三类资源的来源保留、删除、空值和 PVC 模板差异                                        |

## 已确认的高风险差异

### DaemonSet 副本和停止

旧 V3 在 `ContainerSettings/index.jsx` 的 `renderReplicasControl` 对 DaemonSet 返回空，不把 DaemonSet 当作可通过 `spec.replicas` 伸缩的资源。当前 V4 设置 Modal 对所有资源渲染副本输入，公共 Store 的 `stopDeployment` 固定 PATCH `{ spec: { replicas: 0 } }`。项目和集群 DaemonSet 列表都挂载了该公共停止 mutation。

这不是可以通过文案或测试忽略的差异。进入 DEV 前必须决定 DaemonSet 的停止、恢复、重启和批量操作采用什么 Kubernetes 语义，并为成功、403、404、取消和刷新分别设计验证。当前结论是**高风险未知，未关闭**。

### StatefulSet Service 和卷模板

旧 V3 通过 `withService` 同步 StatefulSet 的 Service 端口、selector 和 Headless `clusterIP=None`，并在 `spec.volumeClaimTemplates` 上提供独立的模板操作。当前 V4 的设置转换函数只解析 Pod 模板容器、初始化容器和普通 `spec.volumes`，没有 `serviceName` 或 `volumeClaimTemplates` 的表单值模型。

因此，StatefulSet 不能仅复用 Deployment 的容器/卷表单后标记为完成；当前结论是**资源专属能力未闭环**。

### 字段保留与清空

当前 `buildDeploymentSettingsResource` 先克隆原始对象并删除 `status`，对容器和普通卷执行局部合并；这能证明实现有保留未知字段的意图，但不能证明所有字段的清空语义正确。其中亲和性、调度、元数据和 StatefulSet 专属 Service/PVC 字段仍未进入完整表单；更新策略、终止宽限期、生命周期及安全上下文已有解析、编辑和回写测试，但仍待当前 SHA 的真实环境验收。

## 当前编译制品的策略、调度及优雅终止补证

本节输入提交为 `45f104b6e18215bb6b4f273e1dd16da30107188a`，绑定 V3 tree `1e499d92e11374e26c76f5e13be45251602bd596`。[偏移和摘要清单](./evidence/workload-strategy-20261023-provenance.json)从当前 `1.9ca3a76d71946712055c.js` 惰性提取工厂 1299、1530、1542，不执行 Bundle；源文件 SHA-256 为 `924556b7889c21dbd450535163cdd63e5a6c92daad2cbdc3ec8514a005d765a3`。Byte range 为左闭右开：1299 `[938572,944395)`、1530 `[1191228,1197161)`、1542 `[1217216,1218574)`。

实际 REA 摘要见[归档 JSON](./evidence/workload-strategy-20261023-rea-summary.json)，Evidence ID 为 `ev_6ab1c1b7b16c642fb73277880b271b7da6e4c34b369b16e128f73fdbdacaa646`，父证据为 `ev_41d69a375320fb929ebf0dcc88ac3aba2e5136bf3c94bebc4afc5e248abf1358`。3 个 JS 解析成功、0 解析失败；应用图和语义图仍是 partial，分别有 1 和 820 项 unknown，不能据此声称所有行为已还原。以下字段事实来自具体工厂语法和限定运行时对照。

| 资源/能力            | 当前制品字段、默认值与校验                                                                                                                                                                             | 运行时与差异边界                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Deployment 更新策略  | `spec.strategy.type` 默认 RollingUpdate；`rollingUpdate.maxUnavailable/maxSurge` 渲染默认值均 `25%`，必填，允许非负整数字符串或整数百分比；纯数字在 `getDerivedStateFromProps` 中转为 number           | 真实 V3 草稿改为 `2`、`30%` 后生成 PUT，类型分别为 number/string；不是服务端持久化测试                             |
| StatefulSet 更新策略 | `spec.updateStrategy.rollingUpdate.partition` 默认 0，必填，整数、最小 0；切回 RollingUpdate 的默认初始化分支却拼作 `statfulsets`                                                                      | 草稿改为 1 后生成 number；拼写问题可能影响清空后切回的初始化，尚未运行时复现，不能自动修正或宣称默认恢复正确       |
| DaemonSet 更新策略   | `spec.updateStrategy.rollingUpdate.maxUnavailable` 输入默认 `20%`；但切回 RollingUpdate、原分支为空时写入 `25%`，两处不一致；该输入只有 required，未见 Deployment 同款整数/百分比 validator            | 已有 fixture 当前值为 1，不能据此宣称默认值为 1；编辑后请求值为字符串 `"2"`，保留 `maxSurge:0`，服务端接受性未验证 |
| DaemonSet 就绪时间   | `spec.minReadySeconds`，默认 0，必填，整数、最小 0                                                                                                                                                     | 草稿填 1 后请求值为 number；不产生 `spec.replicas`                                                                 |
| 普通资源优雅终止     | 工厂 1542：`spec.template.spec.terminationGracePeriodSeconds`，默认 30，整数、最小 0；显式 prefix 优先，联邦路径另有模板层级                                                                           | DaemonSet 页面已有值 30；未单独捕获该分区修改请求，不能把策略 PUT 保留原值当成编辑测试                             |
| 调度                 | 工厂 1530：affinity 默认 `{}`；分散使用 podAntiAffinity，聚合使用 podAffinity，preferred 权重 100、hostname topology；自定义 policy/type/target 有完整性检查，关联 Workload 请求使用 cluster/namespace | 当前只取得静态路径；尚未逐项浏览器修改和核对最终写回，不能将编辑器临时 customMode 直接写入 API                     |

工厂 1299 在非 RollingUpdate 策略切换时会 unset 对应 rollingUpdate 分支。以上是当前制品的清除意图；取消后恢复、切回后的默认、字段保留与失败重试仍须用相应场景确认。V4 应保留有效业务语义，并明确处理旧制品自身的不一致，不能机械复制未经确认的缺陷。

浏览器的分区草稿 → 分区勾选保存 → 外层确定、模拟 409、取消和 API 未变更证据见[运行时记录](./workload-runtime-rea-20261023.md#更新策略草稿请求和取消的定向证据)。本节只关闭这些有限字段的定位和请求形态未知；未关闭完整容器/存储、StatefulSet Service/PVC 模板、DaemonSet 运维语义、RBAC、缓存或当前 V4 实现的验收。

## 集群级路由边界（活跃入口与候选组件区分）

本批次不能只验收项目级 `projects/:namespace` 页面。主迁移计划要求集群级页面保留跨 namespace 选择能力，同时移除 Workload 的 V3/Wujie 运行时依赖。当前源码的实际边界如下：

| 路径                                                                                                                                    | 当前实现                                                                                                                                          | 证据                                          | 结论                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx`                                                        | `/deployments`、`/statefulsets`、`/daemonsets` 都挂载 `../Workload/Workloads` 的 `WorkLoadList`，原生 `ApplicationWorkloads/Workloads` 导入被注释 | `routes.tsx:8-15,34-47`                       | 当前集群级入口没有使用已存在的原生列表实现                    |
| `packages/console/src/pages/clusters/containers/Workload/Workloads/index.tsx`                                                           | 三个 Tab 都渲染同一个 `./Embed`                                                                                                                   | `Workloads/index.tsx:20-43`                   | 集群级 Workload 列表仍走桥接组件                              |
| `packages/console/src/pages/clusters/containers/Workload/Deployments/Embed.tsx`                                                         | Wujie URL 为 `/consolev3/clusters/:cluster/deployments`                                                                                           | `Deployments/Embed.tsx:8-17`                  | Deployment 集群列表仍依赖 V3                                  |
| `packages/console/src/pages/clusters/containers/Workload/StatefulSets/Embed.tsx`                                                        | Wujie URL 实际指向 `/consolev3/clusters/:cluster/daemonsets`                                                                                      | `StatefulSets/Embed.tsx:12-17`                | 独立候选 Embed URL 互换；不是活跃主入口已复现缺陷             |
| `packages/console/src/pages/clusters/containers/Workload/DaemonSets/Embed.tsx`                                                          | Wujie URL 实际指向 `/consolev3/clusters/:cluster/statefulsets`                                                                                    | `DaemonSets/Embed.tsx:12-17`                  | 独立候选 Embed URL 互换；不是活跃主入口已复现缺陷             |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/index.tsx`                                               | 已有原生 `ListPage`、namespace 选择器、项目列和三类 Tab；但没有被上述路由挂载                                                                     | `Workloads/index.tsx:1-32,250-327`            | 可作为迁移输入，不能因为代码存在就算集群级原生功能已接通      |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/{Deployments,StatefulSets,DaemonSets}/Detail/routes.tsx` | 集群详情路由由项目 Workload Detail 路由复用                                                                                                       | `ApplicationWorkloads/routes.tsx:15-20,79-89` | 详情路由复用本身不证明列表、集群作用域、Action 和缓存已经等价 |

集群级工作负载的 REA 结论是：

1. 当前项目级列表/详情的有限原生证据不能覆盖集群级列表。
2. 集群级列表仍有 Wujie/V3 运行时依赖。主入口使用通用 `Workloads/Embed/index.tsx` 按 tab 生成 URL，运行时三类资源类型正确；另两个独立 Embed 文件的 URL 互换是未挂载候选组件中的静态风险，不能写成当前主入口已复现的路由缺陷。DEV 应接通原生列表并核对遗留调用方。
3. 集群级原生列表虽然已有代码输入，但其 namespace 选择、跨 namespace 查询、批量 Action、RBAC、缓存和三类详情跳转必须按当前 SHA 独立验证。
4. 在集群级入口完成替换前，不能宣称三类 Workload 已经完成“彻底移除 V3/Wujie”的原生化目标。

## 联邦项目边界

主迁移计划把 `federated` 作为独立作用域，不能用普通项目或集群级资源的证据代替。当前登记批次的能力范围是普通项目与集群级 Deployment、StatefulSet、DaemonSet；联邦对接属于后续独立范围，本节记录它对“全量移除 V3/Wujie”结论的边界，不把后置联邦工作冒充为当前批次已验收。当前联邦 Workload 的源码事实如下：

| 作用域                | 当前实现                                                                                    | 证据                                                                                        | 结论                                                         |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 联邦 Deployment 列表  | `WujieReact` 加载 `/consolev3/:workspace/federatedprojects/:namespace/deployments`          | `packages/console/src/pages/fedprojects/containers/Deployments/index.tsx:7-14`              | 仍依赖 V3/Wujie                                              |
| 联邦 Deployment 详情  | `WujieReact` 加载对应 Deployment 详情 URL                                                   | `packages/console/src/pages/fedprojects/containers/Deployments/Detail/index.tsx:7-14`       | 仍依赖 V3/Wujie                                              |
| 联邦 StatefulSet 列表 | `WujieReact` 加载 `/consolev3/:workspace/federatedprojects/:namespace/statefulsets`         | `packages/console/src/pages/fedprojects/containers/StatefulSets/index.tsx:7-14`             | 仍依赖 V3/Wujie                                              |
| 联邦 StatefulSet 详情 | `WujieReact` 加载对应 StatefulSet 详情 URL                                                  | `packages/console/src/pages/fedprojects/containers/StatefulSets/Detail/index.tsx:7-14`      | 仍依赖 V3/Wujie                                              |
| 联邦 DaemonSet        | 当前 `fedprojects/routes/index.tsx` 和 `routes/details.tsx` 未登记 DaemonSet 列表或详情路由 | `packages/console/src/pages/fedprojects/routes/index.tsx:51-60`、`routes/details.tsx:15-48` | 当前没有可证明的联邦 DaemonSet V4 或 V3 入口，属于未确认范围 |

因此，当前批次需要保留联邦后置边界，并为最终全量迁移明确三项决策和证据：

1. 联邦 Deployment/StatefulSet 是否纳入当前批次的原生化交付；若纳入，必须建立 federation API、override、RBAC、跨集群错误和缓存矩阵。
2. 联邦 DaemonSet 是产品不支持、V3 隐藏能力，还是遗漏路由；在没有证据前不能把它标记为“不适用”。
3. 在联邦范围仍使用 Wujie 的前提下，普通项目和集群级 Workload 的完成结论不能扩展为“Workload 全量已无 V3/Wujie”。

## 配置引用的 V3 Action 桥接

普通项目三类 Workload 的配置引用页面虽然有 V4 原生的摘要、预览和编辑组件，但当前编辑入口仍保留 V3 Action 桥接：

| 位置                                                                                    | 当前事实                                                                                                        | 影响                                                              |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/console/src/pages/projects/components/ConfigReference/entry.tsx:4,29-32`      | 导入并调用 `useV3action()`                                                                                      | 配置引用入口仍依赖 V3 Action 总线                                 |
| `entry.tsx:99-114,267-377`                                                              | 绑定 `consolev3` / `consoleV3Actions` 的 Wujie shadow root，并监听 V3 DOM                                       | 原生页面仍依赖嵌入 V3 页面结构和 `data-test` 锚点                 |
| `entry.tsx:383-414`                                                                     | 先读取原生 Workload API，再调用 `actions.open({ action: 'workload.template.edit', v3Module: 'workload', ... })` | 配置引用编辑仍由 V3 表单承载，不能算完全脱离 V3                   |
| `packages/console/src/pages/projects/components/ConfigReference/bridge.ts:16-25,97-101` | 明确描述 Wujie、embedded V3 form 和 V3 action row                                                               | 该桥接是已确认依赖，不是未知项                                    |
| `packages/console/src/pages/projects/components/ConfigReference/nativeEdit.ts`          | 提供原生回调和 Patch 生成逻辑                                                                                   | 这是可复用的 V4 替代输入，但尚未替换 `useV3action` 的入口生命周期 |

当前配置引用测试覆盖了 Patch 构造、容器选择和摘要显示，但没有证明 `useV3action`、Wujie shadow root 和 V3 表单可以移除。三类 Workload 的“配置引用已原生化”结论必须等替换入口并在当前 SHA 浏览器中验证后才能成立。

## REA 结论

## 当前已有测试的覆盖边界

本轮在当前 HEAD 上运行了以下既有测试文件，结果为 6 个文件、27 个断言全部通过：

- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/native.test.ts`：2/2；
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/native.test.ts`：1/1；
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/native.test.ts`：1/1；
- `packages/console/src/pages/projects/containers/StatefulSets/index.test.ts`：2/2；
- `packages/console/src/pages/projects/containers/DaemonSets/index.test.ts`：2/2；
- `packages/shared/src/stores/workload/index.test.ts`：19/19。

这些测试证明项目级列表/详情没有直接引用 V3 桥接、Store 的部分成功/失败请求行为以及创建作用域保持；它们没有证明：

1. StatefulSet 或 DaemonSet 的“编辑设置”打开原生表单；
2. 集群级列表没有挂载 Wujie/V3；
3. DaemonSet 的停止语义正确；
4. StatefulSet Service、PVC 模板和三类资源高级字段等价；
5. 当前 SHA 部署后的浏览器、RBAC、缓存和 namespace 隔离行为。

因此，既有测试的绿色结果不能作为 REA 放行或 DEV/VERIFY 通过依据。

本轮补充后，已进一步关闭以下静态定位未知：

- 旧 V3 页面分区和资源差异的具体源码路径；
- Deployment、StatefulSet、DaemonSet 的更新策略字段差异；
- DaemonSet 旧 V3 不显示副本控件的证据；
- StatefulSet Service 和 `volumeClaimTemplates` 的旧 V3 写回路径；
- 当前 V4 设置 Modal 和转换函数实际覆盖的字段边界。

本次复核把待补证与后续实现分开：

| 分类          | 当前结论与后续动作                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| REA 待补证    | 当前制品三类资源的完整容器/卷字段、默认值、校验、保留与清空语义尚未逐项与真实 V3 页面/请求对齐；更新策略的有限补证不覆盖这些字段                |
| REA 待补证    | StatefulSet Service/PVC 模板、DaemonSet 停止/恢复的实际 Action 语义，以及三类资源的权限、作用域、缓存和错误边界仍需限定取证                     |
| 已知 DEV 差异 | STS/DS 编辑设置仍打开 YAML；集群列表仍走 Wujie/V3；配置引用仍调用 `useV3action` 并绑定 V3 DOM。REA 需明确替代边界，不能要求本阶段先实现后续功能 |
| 后续 VERIFY   | 当前 SHA 的构建、部署、持久化、低权限 UI、namespace 隔离、缓存和完整等价验收均未完成；这些不是 REA 前置要求                                     |
| 后置范围      | 联邦对接另行登记；不能把它算作当前普通项目/集群批次已完成，也不将未安装插件等后置项扩大为当前批次统一阻塞                                       |
| 正式复核      | `module-execution.json` 的 review 仍为空；证据补齐后按既定规则提交真实复核，不补造签署                                                          |

结论保持：**REA / 分析中，待负责人复核；暂不进入 DEV。**
