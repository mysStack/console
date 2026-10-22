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

| 能力组                     | 旧 V3 证据                                                                                                                                                                            | 当前 V4 证据                                                                                                                         | Deployment | StatefulSet                                               | DaemonSet                                               | REA 结论与后续动作                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 基本信息、名称和项目       | `src/components/Forms/Workload/ContainerSettings/index.jsx` 负责读取模板；旧基础信息入口另见 `src/components/Forms/Workload/BaseInfo/index.jsx`                                       | `WorkloadSettingsModal.tsx:110-115` 只展示禁用的名称和项目；`deployment.ts:423-434` 解析名称、namespace、别名和描述                  | 部分       | 入口仍未接入                                              | 入口仍未接入                                            | 需要确认编辑时别名、描述、保留注解和不可变项目字段的展示、写回及清空语义                                                    |
| 副本数                     | `ContainerSettings/index.jsx:201` 从 `spec.replicas` 读取；旧渲染逻辑对 DaemonSet 不显示副本控件                                                                                      | `WorkloadSettingsModal.tsx:116-118` 无资源类型判断，统一渲染副本输入；`deployment.ts:430,611` 统一读取/写入 `spec.replicas`          | 有限       | 不应直接继承 Deployment 语义，需单独确认 StatefulSet 伸缩 | 高风险：DaemonSet 不应提供 Deployment 式副本伸缩        | DEV 前必须按资源类型决定适用操作和 UI；不能把 DaemonSet 的显示存在写成支持伸缩                                              |
| 容器、初始化容器           | 旧 `ContainerSettings/index.jsx:722-735` 渲染容器列表，`ContainerForm/index.jsx` 负责容器字段                                                                                         | 当前 `WorkloadSettingsModal.tsx:120-156` 提供容器和初始化容器；`deployment.ts:361-387,452-565` 解析、校验并合并部分字段              | 部分       | 入口未接入                                                | 入口未接入                                              | 当前 V4 已有公共子集；需逐项补齐旧 V3 容器高级字段和清空/保留行为                                                           |
| 镜像、拉取策略、命令和参数 | `ContainerForm/ContainerSetting/index.jsx`、`Commands/index.jsx`、`ImagePullPolicy/index.jsx`                                                                                         | `deployment.ts:437-449,639-644` 支持镜像、拉取策略、命令和参数                                                                       | 部分       | 未接入                                                    | 未接入                                                  | 需要分别验证三类资源的表单入口、payload 和原字段保留                                                                        |
| 端口、环境和配置引用       | `ContainerForm/Ports/index.jsx`、`Environments/index.jsx`、`ContainerForm/index.jsx`                                                                                                  | `deployment.ts:369-381,478-509` 支持端口、字面量环境、ConfigMap/Secret `envFrom`，并保留部分 `valueFrom`                             | 部分       | 未接入                                                    | 未接入                                                  | 需要验证引用删除、重复项、Service 端口关联和三类资源的回读                                                                  |
| 健康检查                   | `ContainerForm/HealthChecker/index.jsx`、`ProbeForm/*`                                                                                                                                | `deployment.ts:334-358,382-384,549-561` 支持 HTTP/TCP/command 的部分探针字段                                                         | 部分       | 未接入                                                    | 未接入                                                  | 需要核对旧 V3 的默认值、字段清空、gRPC 或其他保留字段及错误反馈                                                             |
| 生命周期、容器安全和时区   | `ContainerForm/LifeManagement/index.jsx`、`ContainerForm/SecurityContext/*`、`SyncTimeZone/index.jsx`                                                                                 | 当前 `ContainerCreateValues` 和 `ContainerInput` 取证范围没有对应字段；`WorkloadSettingsModal.tsx:132-153` 仅挂载公共容器输入        | 未完成     | 未接入                                                    | 未接入                                                  | 不能通过当前容器子集宣称 V3 等价；需先确定字段范围和 API 写回方案                                                           |
| Pod 安全上下文             | `ContainerSettings/PodSecurityContext/index.jsx`，由 `ContainerSettings/index.jsx:754-759` 渲染                                                                                       | 当前设置 Modal 没有对应 FormItem；`deployment.ts:423-434` 不解析 `spec.template.spec.securityContext`                                | 未完成     | 未接入                                                    | 未接入                                                  | 需要保留/编辑策略及权限错误路径，不能默默丢失                                                                               |
| 亲和性                     | `ContainerSettings/PodAffinity/index.jsx`、`Affinity/index.jsx`，由 `ContainerSettings/index.jsx:762-778` 渲染                                                                        | 当前设置 Modal 没有对应字段；当前转换逻辑未解析 `affinity`                                                                           | 未完成     | 未接入                                                    | 未接入                                                  | 需要分别核对 node/pod affinity、反亲和性和容忍度的历史入口                                                                  |
| 终止宽限期                 | `ContainerSettings/TerminationSeconds/index.jsx:33-42` 写入 `spec.template.spec.terminationGracePeriodSeconds`，默认值 30，最小值 0                                                   | 当前设置 Modal 没有对应字段；当前转换逻辑未解析该路径                                                                                | 未完成     | 未接入                                                    | 未接入                                                  | 需要决定编辑、默认值、清空和原字段保留语义，并加入 API/组件测试                                                             |
| 更新策略                   | `ContainerSettings/UpdateStrategy/index.jsx:94-145,148-267`；Deployment 使用 `maxUnavailable/maxSurge`，StatefulSet 使用 `partition`，DaemonSet 使用 `maxUnavailable/minReadySeconds` | 当前设置 Modal 没有策略分区；`deployment.ts:591-612` 编辑时克隆原对象但不提供策略表单                                                | 未完成     | 未完成                                                    | 未完成                                                  | 三类资源必须独立处理，不能以公共 Deployment 策略替代资源差异；旧源码中 `statfulsets` 分支拼写异常，需用运行时证据校准默认值 |
| 节点调度                   | `AdvanceSettings/index.jsx:61-71` 对 DaemonSet 排除节点选择；`NodeSchedule/index.jsx:28-35` 写入 `spec.template.spec.nodeSelector`                                                    | 当前设置 Modal 没有节点调度字段                                                                                                      | 部分待核对 | 部分待核对                                                | 旧 V3 明确不提供该分区，但 DaemonSet 的调度语义仍需保留 | 需要确认当前 V4 是否有其他入口、DaemonSet 的节点约束和错误反馈，不得从“没有旧控件”推断可删除字段                            |
| Pod IP 池                  | `AdvanceSettings/index.jsx:55-60` 在网络模块启用且非联邦入口时渲染 `PodIPRange`                                                                                                       | 当前设置 Modal 没有对应字段                                                                                                          | 未完成     | 未完成                                                    | 未完成                                                  | 需要确认模块开关和当前 V4 替代；不能把集群能力直接加入普通表单                                                              |
| Pod 模板元数据             | `AdvanceSettings/Metadata/index.jsx` 处理 labels/annotations，并隐藏保留注解；`ContainerSettings/index.jsx:793-806` 负责容器设置内入口                                                | 当前 `deployment.ts:428-429` 只读取别名/描述注解；`buildDeploymentSettingsResource` 仅克隆原对象，不提供 labels/annotations 编辑     | 部分       | 未接入                                                    | 未接入                                                  | 需要验证标签校验、重复标签、保留注解和清空行为；编辑时未知注解不得丢失                                                      |
| StatefulSet Service        | `ContainerSettings/index.jsx:175-198,453-515` 初始化 Service、同步端口/selector，并对 StatefulSet 设置 `clusterIP=None`；StatefulSet 通过 `withService` 进入                          | 当前设置 Modal 没有 Service 区域；已有 `useWorkloadService.tsx` / Service Store 是独立静态入口                                       | 不适用     | 未完成                                                    | 不适用                                                  | 必须单独设计 StatefulSet Service 编辑和保存、Headless 行为，不能由普通 Workload 表单替代                                    |
| StatefulSet 卷模板         | `VolumeSettings/index.jsx:333-354,524-676` 维护 `spec.volumeClaimTemplates`，并有专用添加/编辑组件                                                                                    | `deployment.ts:423-434` 只读取 `spec.template.spec.volumes`；`buildDeploymentSettingsResource:597-612` 不处理 `volumeClaimTemplates` | 不适用     | 未完成                                                    | 不适用                                                  | 这是 StatefulSet 必须补齐的资源差异；需要确认不可变字段、PVC 模板和挂载关联的写回/错误语义                                  |
| 卷、挂载和配置卷           | 旧 `VolumeSettings/index.jsx` 管理 PVC、临时卷、HostPath、ConfigMap/Secret、挂载和日志相关注解                                                                                        | `WorkloadSettingsModal.tsx:158-173` 提供普通卷；`deployment.ts:390-420,567-589` 支持有限来源并保留未知来源                           | 部分       | 仅普通卷子集                                              | 仅普通卷子集                                            | 需要分别验证三类资源的来源保留、删除、空值和 PVC 模板差异                                                                   |

## 已确认的高风险差异

### DaemonSet 副本和停止

旧 V3 在 `ContainerSettings/index.jsx` 的 `renderReplicasControl` 对 DaemonSet 返回空，不把 DaemonSet 当作可通过 `spec.replicas` 伸缩的资源。当前 V4 设置 Modal 对所有资源渲染副本输入，公共 Store 的 `stopDeployment` 固定 PATCH `{ spec: { replicas: 0 } }`。项目和集群 DaemonSet 列表都挂载了该公共停止 mutation。

这不是可以通过文案或测试忽略的差异。进入 DEV 前必须决定 DaemonSet 的停止、恢复、重启和批量操作采用什么 Kubernetes 语义，并为成功、403、404、取消和刷新分别设计验证。当前结论是**高风险未知，未关闭**。

### StatefulSet Service 和卷模板

旧 V3 通过 `withService` 同步 StatefulSet 的 Service 端口、selector 和 Headless `clusterIP=None`，并在 `spec.volumeClaimTemplates` 上提供独立的模板操作。当前 V4 的设置转换函数只解析 Pod 模板容器、初始化容器和普通 `spec.volumes`，没有 `serviceName` 或 `volumeClaimTemplates` 的表单值模型。

因此，StatefulSet 不能仅复用 Deployment 的容器/卷表单后标记为完成；当前结论是**资源专属能力未闭环**。

### 字段保留与清空

当前 `buildDeploymentSettingsResource` 先克隆原始对象并删除 `status`，对容器和普通卷执行局部合并；这能证明实现有保留未知字段的意图，但不能证明所有字段的清空语义正确。尤其是未进入表单的更新策略、亲和性、安全上下文、终止宽限期、元数据和 StatefulSet 专属字段，目前没有对应的解析、编辑和回写测试。

## 集群级路由边界

本批次不能只验收项目级 `projects/:namespace` 页面。主迁移计划要求集群级页面保留跨 namespace 选择能力，同时移除 Workload 的 V3/Wujie 运行时依赖。当前源码的实际边界如下：

| 路径                                                                                                                                    | 当前实现                                                                                                                                          | 证据                                          | 结论                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx`                                                        | `/deployments`、`/statefulsets`、`/daemonsets` 都挂载 `../Workload/Workloads` 的 `WorkLoadList`，原生 `ApplicationWorkloads/Workloads` 导入被注释 | `routes.tsx:8-15,34-47`                       | 当前集群级入口没有使用已存在的原生列表实现                    |
| `packages/console/src/pages/clusters/containers/Workload/Workloads/index.tsx`                                                           | 三个 Tab 都渲染同一个 `./Embed`                                                                                                                   | `Workloads/index.tsx:20-43`                   | 集群级 Workload 列表仍走桥接组件                              |
| `packages/console/src/pages/clusters/containers/Workload/Deployments/Embed.tsx`                                                         | Wujie URL 为 `/consolev3/clusters/:cluster/deployments`                                                                                           | `Deployments/Embed.tsx:8-17`                  | Deployment 集群列表仍依赖 V3                                  |
| `packages/console/src/pages/clusters/containers/Workload/StatefulSets/Embed.tsx`                                                        | Wujie URL 实际指向 `/consolev3/clusters/:cluster/daemonsets`                                                                                      | `StatefulSets/Embed.tsx:12-17`                | StatefulSet 集群入口与目标资源不一致，属于已确认路由缺陷      |
| `packages/console/src/pages/clusters/containers/Workload/DaemonSets/Embed.tsx`                                                          | Wujie URL 实际指向 `/consolev3/clusters/:cluster/statefulsets`                                                                                    | `DaemonSets/Embed.tsx:12-17`                  | DaemonSet 集群入口与目标资源不一致，属于已确认路由缺陷        |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/index.tsx`                                               | 已有原生 `ListPage`、namespace 选择器、项目列和三类 Tab；但没有被上述路由挂载                                                                     | `Workloads/index.tsx:1-32,250-327`            | 可作为迁移输入，不能因为代码存在就算集群级原生功能已接通      |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/{Deployments,StatefulSets,DaemonSets}/Detail/routes.tsx` | 集群详情路由由项目 Workload Detail 路由复用                                                                                                       | `ApplicationWorkloads/routes.tsx:15-20,79-89` | 详情路由复用本身不证明列表、集群作用域、Action 和缓存已经等价 |

集群级工作负载的 REA 结论是：

1. 当前项目级列表/详情的有限原生证据不能覆盖集群级列表。
2. 集群级列表仍有 Wujie/V3 运行时依赖，且 StatefulSet 与 DaemonSet Embed 的 URL 互换必须在 DEV 中修复并用浏览器验证。
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

仍未满足 REA 放行条件：

1. 当前 `v3dist` 的完整三类资源行为、字段和默认值尚未逐项与真实旧 V3 页面/Network 对齐；
2. StatefulSet、DaemonSet 当前原生编辑设置入口尚未实现，当前运行时仍打开 YAML；
3. DaemonSet 停止/恢复语义与公共 `spec.replicas=0` mutation 的差异未处理；
4. StatefulSet Service、卷模板、更新策略及三类资源的完整 API/Store/缓存/错误边界未闭环；
5. 当前 SHA 尚未完成构建、部署和浏览器 VERIFY，低权限浏览器正反路径也未完成；
6. `module-execution.json` 尚无负责人复核记录，不能由本记录自签放行 DEV。
7. 集群级列表仍由 Wujie/V3 承载，StatefulSet/DaemonSet Embed URL 互换，集群作用域和跨 namespace 行为尚未闭环。
8. 联邦 Deployment/StatefulSet 仍由 Wujie/V3 承载，联邦 DaemonSet 的产品范围和入口尚未证实。
9. 普通 Workload 配置引用仍调用 `useV3action` 并绑定 Wujie/V3 DOM，原生 Patch 组件尚未成为唯一编辑入口。

结论保持：**REA / 分析中，待负责人复核；暂不进入 DEV。**
