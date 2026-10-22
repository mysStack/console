# Workload 编辑设置旧源码与当前实现对照（2026-10-24）

## 证据范围

本记录使用固定的旧源码候选 `origin/release-3.4`，提交为 `175710fefeeba6ff295c2c0967b4d45b83563d26`。旧源码只用于确认历史页面结构和 Action 关系，不作为当前 `v3dist` 的完整来源证明。当前编译制品的入口、Action 和分区证据见[组合能力矩阵](./workload-kind-capability-matrix.md#2026-10-23-定向制品证据普通资源编辑入口与分区)。

本次取证读取了：

```bash
git show origin/release-3.4:src/configs/steps/deployments.js
git show origin/release-3.4:src/configs/steps/statefulsets.js
git show origin/release-3.4:src/configs/steps/daemonsets.js
git show origin/release-3.4:src/actions/workload.js
git show origin/release-3.4:src/pages/projects/containers/Deployments/Detail/index.jsx
git show origin/release-3.4:src/pages/projects/containers/StatefulSets/Detail/index.jsx
git show origin/release-3.4:src/pages/projects/containers/DaemonSets/Detail/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/ContainerSettings/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/ContainerSettings/UpdateStrategy/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/ContainerSettings/Affinity/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/VolumeSettings/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/VolumeSettings/VolumeTemplateList/index.jsx
```

## 旧源码确认的公共结构与资源差异

三个 `src/configs/steps/*.js` 都包含四个必需步骤：`BASIC_INFORMATION`、`POD_SETTINGS`、`STORAGE_SETTINGS`、`ADVANCED_SETTINGS`。三类资源均使用 `BaseInfo`、`ContainerSettings`、`VolumeSettings`、`AdvanceSettings`。StatefulSet 的 `POD_SETTINGS` 额外通过 `withProps(ContainerSettings, { withService: true })` 提供 Service 关联设置；Deployment 和 DaemonSet 没有这个参数。

| 资源        | 编辑入口                                              | 资源特有 Action             | 共同运维 Action                                                                                                      |
| ----------- | ----------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Deployment  | `workload.template.edit`，传 `supportGpuSelect: true` | `workload.hpa.edit`         | `resource.baseinfo.edit`、`workload.revision.rollback`、`resource.yaml.edit`、`workload.redeploy`、`workload.delete` |
| StatefulSet | `workload.template.edit`                              | `workload.service.edit`     | `resource.baseinfo.edit`、`workload.revision.rollback`、`resource.yaml.edit`、`workload.redeploy`、`workload.delete` |
| DaemonSet   | `workload.template.edit`                              | 无 HPA/Service 编辑入口记录 | `resource.baseinfo.edit`、`workload.revision.rollback`、`resource.yaml.edit`、`workload.redeploy`、`workload.delete` |

`src/actions/workload.js` 确认：`workload.template.edit` 保存前移除非空 `spec.template.spec.customMode`，调用 `store.update(detail, data)`；StatefulSet 传入 `hideVolumeSetting`。`workload.service.edit` 根据 `spec.serviceName` 构造 `Headless(Selector)` Service 详情并通过 Service Store 更新。`workload.redeploy` 写入 `spec.template.metadata.annotations['kubesphere.io/restartedAt']`。`workload.hpa.edit` 由 Deployment 使用，涉及 HPA Store 和 Deployment 关联注解。删除及批量删除由独立 Action 处理，批量删除还会清理关联 HPA。

这些事实只证明旧源码中存在这些路径，不能证明当前制品和 V4 已完整等价。

## 旧源码分区与资源差异的行级复核（2026-10-23）

本节绑定 `origin/release-3.4` 的固定提交 `175710fefeeba6ff295c2c0967b4d45b83563d26`。行号来自以下命令输出的 `git show ... | nl -ba`，用于复核字段边界；它不把该分支当作当前 `v3dist` 构建来源。

| 证据位置                                                                   | 已确认行为                                                                                                                        | 对当前 V4 的影响                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/components/Forms/Workload/ContainerSettings/index.jsx:97-100,175-197` | `withService` 时会初始化 StatefulSet Service 名称，并写入 `spec.serviceName`；普通 Deployment/DaemonSet 不进入该路径              | StatefulSet 必须保留 Service 关联语义，不能只复用 Deployment 的 Pod 表单                    |
| `ContainerSettings/index.jsx:697-709`                                      | `renderReplicasControl` 对 DaemonSet 直接返回空；Deployment/StatefulSet 才渲染副本或联邦部署位置控件                              | DaemonSet 的停止、恢复和列表批量 Action 不能复用 `spec.replicas` 语义                       |
| `ContainerSettings/index.jsx:722-743,745-752`                              | 容器列表、更新策略均是公共设置分区                                                                                                | 公共底座可以复用，但更新策略字段必须按资源类型分派                                          |
| `ContainerSettings/index.jsx:754-791`                                      | Pod SecurityContext、调度、终止宽限期都是独立分区；宽限期使用 `spec.template.spec.terminationGracePeriodSeconds`，默认 30，最小 0 | 当前 V4 简化 Modal 未覆盖这些字段，需区分未编辑保留和主动清空                               |
| `ContainerSettings/index.jsx:793-803,827-838`                              | Pod 元数据是独立可勾选分区；页面顺序为副本/容器、更新策略、安全上下文、调度、优雅终止、元数据                                     | 三类资源的原生设置需要恢复分区边界和取消/草稿语义，不能只增加几个输入框                     |
| `VolumeSettings/index.jsx:129-173,190-250`                                 | 普通卷支持已有卷、PVC/临时卷、HostPath、ConfigMap/Secret 和挂载同步；编辑 ConfigMap/Secret 卷进入单独配置路径                     | V4 的 `preserved` 只保留未识别来源，不能替代已知来源的编辑、删除和挂载联动验证              |
| `VolumeSettings/index.jsx:284-298`                                         | Deployment/DaemonSet 的 PVC 会影响最大不可用校验，卷变化可能触发策略约束                                                          | 卷和更新策略不能完全独立处理，至少要保留该跨字段关系的测试项                                |
| `VolumeSettings/index.jsx:333-355,420-440`                                 | StatefulSet 单独维护 `spec.volumeClaimTemplates`，模板更新和普通卷更新是两条路径                                                  | StatefulSet 的 PVC 模板不能通过 `spec.template.spec.volumes` 代替；当前 V4 必须单独建模     |
| `VolumeSettings/index.jsx:649-690`                                         | 只有 StatefulSet 展示 VolumeTemplateList；普通资源展示普通 VolumeList                                                             | 三类资源的存储分区存在明确差异，不能用同一组字段隐藏资源类型                                |
| `ContainerSettings/Affinity/index.jsx:122-249`                             | 调度支持默认、分散、聚合和自定义；自定义项要求 policy/type/target 完整，并向 namespace 内 Workload Store 取目标                   | 当前 V4 尚未覆盖调度写回和校验；`customMode` 只能作为 UI 临时状态，不能写进 Kubernetes 资源 |

这次行级复核关闭了“旧 V3 是否包含 StatefulSet Service/PVC 模板、DaemonSet 无副本控件、调度/安全/宽限期/元数据分区”的静态未知。它没有关闭当前制品运行时保存、当前 V4 组件实现、RBAC、缓存或浏览器等价性；这些仍按阶段记录保留为未完成。

## 当前 V4 对照结果

| 检查项                   | 当前 V4 事实                                                                    | 状态                                               |
| ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| Deployment 编辑设置      | `WorkloadSettingsModal` 已接入；入口读取原始资源，保存使用 resourceVersion 保护 | 阶段性实现，字段和分区未完整等价                   |
| StatefulSet 编辑设置     | `editConfigTemplate` 当前调用 `editYaml(detail)`                                | 已确认缺口                                         |
| DaemonSet 编辑设置       | `editConfigTemplate` 当前调用 `editYaml(detail)`                                | 已确认缺口                                         |
| StatefulSet Service 编辑 | 当前详情保留 `useWorkloadService` 和 `editWorkloadService`                      | 请求、权限、错误和浏览器行为未闭环                 |
| 三类资源设置分区         | 当前 Modal 只渲染名称、namespace、replicas、容器、初始化容器、卷                | 尚未覆盖基础/高级/更新策略/调度/宽限期/IP 池等分区 |
| 共同运维 Action          | 三类详情均有部分原生 Action 和 Store                                            | API、RBAC、缓存、错误及 V3 等价未完成              |

当前 `WorkloadSettingsModal` 面向 Deployment 字段，不能直接作为 StatefulSet/DaemonSet 的等价实现。三类资源可以共用容器、探针、资源和卷编辑底座，但必须通过资源类型参数控制更新策略、调度、Service、卷模板和适用 Action；不适用字段要明确只读或隐藏，并记录依据。

## 131 旧 V3 分区快照的结构化归档

本次只读浏览器记录已归档为[结构化快照](./evidence/workload-settings-ui-20261023.json)。它确认当前已部署旧 V3 的分区名、输入路径和已有测试对象值：Deployment 有更新策略、容器、普通卷、调度和终止分区；StatefulSet 有更新策略、容器、终止、普通卷和调度分区；DaemonSet 有更新策略、容器组、普通卷和终止分区。StatefulSet 的 Service 操作在详情页单独存在，PVC 模板属于旧源码确认的专属能力。

快照只记录可见 UI，不代表默认值、保存结果或字段完整性。它与[更新策略请求记录](./evidence/workload-strategy-20261023-runtime.json)共同说明了当前 V3 的资源差异，不能替代后续 V4 当前 SHA 的浏览器验收。

## 当前 V4 Action、API、作用域和缓存边界复核（2026-10-23）

| Action              | Deployment | StatefulSet       | DaemonSet            | 当前 V4 静态证据与结论                                                                                                                                          |
| ------------------- | ---------- | ----------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 列表/详情/Watch     | 有         | 有                | 有                   | `useUrl.ts:85-109` 按 `cluster/namespace/module/name` 构造资源 URL；`workload/index.ts:140-145` 详情查询 key 含 module 和 params。真实当前 SHA Network 尚未验证 |
| 创建                | 有         | 有                | 有                   | `base.ts:145-147` POST 到带作用域的 list URL；资源差异由创建转换处理，当前组合批次未逐项部署验证                                                                |
| 基础信息编辑        | 有         | 有                | 有                   | `useCommonActions:54-65` PATCH 详情 URL，成功后使列表 revision 增加并调用页面回调；403/404/缓存刷新 UI 未完成运行时闭环                                         |
| 编辑 YAML           | 有         | 有                | 有                   | `useCommonActions:119-161` PUT 完整 YAML，BaseStore 自动补 resourceVersion；仍需当前 SHA 的三类浏览器验收                                                       |
| 原生编辑设置        | 部分       | 无，当前进入 YAML | 无，当前进入 YAML    | Deployment 当前只覆盖简化字段；STS/DS 是已确认 DEV 缺口                                                                                                         |
| 重启/重新创建       | 有         | 有                | 有                   | 详情页对 `spec.template.metadata.annotations['kubesphere.io/restartedAt']` 发 PATCH；成功/失败/取消和回读未分别验证                                             |
| 回滚                | 有         | 有                | 有                   | `useRollbackMutation:271-288` 发详情 PATCH，Deployment 使用 JSON Patch content type；Revision 控制器和权限错误需后续验证                                        |
| 删除/批量删除       | 有         | 有                | 有                   | `workload/index.ts:108-132,161-204` 使用 Background DeleteOptions 并等待所有请求；关联 HPA 清理、取消、403/404 和列表刷新需后续验证                             |
| 停止/批量停止       | 有         | 有                | 有（当前实现有风险） | `workload/index.ts:206-224` 对所有 module 固定 PATCH `spec.replicas=0`；旧 V3 对 DaemonSet 不显示副本控件，必须在 DEV 修复资源分派，不能宣称现状等价            |
| HPA                 | 有         | 不适用            | 不适用               | 旧源码和当前详情只在 Deployment 展示 HPA；不把该 Action 复制到 STS/DS                                                                                           |
| StatefulSet Service | 不适用     | 有                | 不适用               | `useWorkloadService.tsx:14-39` 调用 `serviceStore.patch`；Headless/Selector payload、权限和失败提示仍需验证                                                     |

请求静态边界：`BaseStore.fetchListByK8s:98-115` 和 `useUrl.ts:97-109` 均接受 cluster/namespace；`useCommonActions` 在编辑/删除成功后调用 `invalidateResourceList(store.module)`，但该 revision 机制不是 React Query 自动失效，详情查询仍依赖显式 `refetch()`。当前证据只支持“有作用域构造和显式回调”，不支持“全部缓存已正确失效”。

因此，当前 REA 材料可以把 Action/API/作用域/缓存的未知项拆成已定位的实现事实和待验证的行为项；DaemonSet 停止语义、STS Service/PVC 模板、完整设置字段和集群 V3/Wujie 入口仍是进入 DEV 前需要明确处理的高风险差异。

## 进入 DEV 前仍需关闭

1. 当前 `v3dist` 对四个分区的完整字段、默认值、跨字段校验和清空/保留语义；
2. `store.update`、Service Store、HPA Store 的请求方法、URL、payload、resourceVersion 和错误反馈；
3. 三类资源的 RBAC 正反路径、项目/namespace/cluster 作用域、联邦限制和缓存失效；
4. 真实 V3 页面/Network 与当前制品静态结果的校准；
5. 当前 V4 三类资源分别的组件测试和后续 131 浏览器验收场景。

本记录支持下一轮定向 REA 和 DEV 设计，不授权跳过阶段门禁直接修改业务代码。阶段记录继续保持 `REA / 分析中`，`review` 仍为 `null`。

## Store、API、作用域和缓存的定向取证（2026-10-23）

### 当前 V4 的请求边界

以下结论来自当前分支源码，属于静态取证；没有把静态 URL 生成等同于 131 环境的实际网络验证。

| 能力                 | 当前 V4 证据                                                                                                                                                                                                                                                  | 当前结论                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 项目/集群列表        | `packages/shared/src/hooks/useUrl/index.ts:85-87` 生成 `kapis/resources.kubesphere.io/v1alpha3` 加 cluster、workspace 或 namespace 路径；`packages/shared/src/stores/store.ts:67-101` 将 `cluster`、`namespace` 从查询参数中拆出后请求                        | 具备作用域参数入口；仍需浏览器 Network 证明项目列表没有越界到全量资源                                                                                        |
| Kubernetes 列表/创建 | `useUrl/index.ts:97-102` 使用 `getApiVersion(module, k8sVersion)` 加 namespace 路径；`store.ts:151-153` 的 `post` 使用同一列表 URL                                                                                                                            | URL 构造可追溯；API 版本、RBAC 403 和创建后的列表刷新尚未在三类资源上逐项验证                                                                                |
| 详情/Watch           | `useUrl/index.ts:89-109` 从同一列表 URL 派生详情 URL 和 Watch URL；三类详情分别调用 `store.getWatchListUrl({cluster, namespace})` 并在事件后 `refetch()`                                                                                                      | 详情和 Watch 带作用域；Watch 失败、断线重连和直达 URL 仍需运行时证据                                                                                         |
| 编辑设置             | Deployment 详情先用 `request.get(store.getDetailUrl(...))` 读取原始资源，再调用 `store.usePutMutation({ noGetDetail: true })`；`packages/shared/src/stores/store.ts:166-180` 最终向详情 URL发送 PUT。StatefulSet、DaemonSet 当前入口仍调用 `editYaml(detail)` | Deployment 当前保留原始 `metadata.resourceVersion` 并走 PUT；StatefulSet、DaemonSet 尚未接入同一原生设置表单，三类资源的 payload、冲突和字段保留仍需逐项验证 |
| 删除                 | `workload/index.ts:108-115` 使用详情 URL和 `DeleteOptions`，传播策略为 `Background`；带关联 HPA 时先加入 HPA 删除请求                                                                                                                                         | 删除链路有静态证据；多选、关联 HPA、403/404、取消和删除后列表刷新仍未分别验证                                                                                |
| StatefulSet Service  | `packages/console/src/pages/clusters/hooks/useModal/useWorkloadService.tsx:14-39` 通过 `serviceStore.patch(detail, data)` 保存；`packages/shared/src/stores/service.ts:163-180` 对 Service 详情发 PATCH；项目详情仍由 `StatefulSets/Detail/index.tsx` 触发    | 已确认原生 Service Store 入口；Headless/Selector payload、权限拒绝、错误提示和保存后详情刷新未闭环                                                           |

### 旧 V3 与当前 V4 的请求差异

固定旧源码 `origin/release-3.4`（`175710fefeeba6ff295c2c0967b4d45b83563d26`）的 `src/stores/base.js:253-267` 显示，编辑设置历史路径先 GET 详情读取 `metadata.resourceVersion`，再使用 PUT 写回完整对象。当前 V4 Deployment 详情同样先读取原始资源，再以 `noGetDetail: true` 调用 `store.usePutMutation`，因此静态上已确认是“原始快照 + PUT”路径；StatefulSet、DaemonSet 尚未接入该 Modal。仍必须在真实环境记录三类资源的请求方法、请求体、并发更新和未编辑字段保留结果，不能把静态一致直接写成等价通过。

旧源码的删除路径还会以 Background 传播策略删除资源，并在关联 HPA 时追加 HPA 删除请求；当前 V4 保留了这条静态关系，但 `batchDelete` 的参数、cluster 传递和成功后列表刷新需要单独验证。旧源码 `stop` 对 DaemonSet 使用不可调度的 nodeSelector，而当前 V4 `workloadStore('daemonsets')` 复用 `useBatchStopDeploymentMutation`，其 `stopDeployment` 固定向 `spec.replicas` 写入 0；项目 DaemonSet 列表和集群 Workload 列表都实际挂载该批量停止入口。这已经是需要 DEV 处理的高风险资源差异，不能把 Deployment 的停止行为复用为 DaemonSet 通过证据。

### 缓存和错误边界

- 当前详情查询 key 为 `[module, params]`（`workload/index.ts:140-145`），其中 `module` 区分三类资源，`params` 包含 cluster、namespace、name；这证明了查询键包含作用域，但没有证明列表查询和详情查询在 mutation 成功后自动失效。
- 当前详情页多数 mutation 成功后显式调用 `refetch()`；静态搜索未发现三类 Workload Store 在更新、创建、删除后统一调用 `invalidateQueries` 或 `setQueryData`。因此“缓存失效”只能记录为未验证，不能由 `onSuccess` 存在推断为通过。
- `settleWorkloadRequests` 会等待所有请求并重新抛出任一失败（`workload/index.ts:10-18`），现有 Store 测试覆盖了部分 403、500、网络错误和关联 HPA 失败；这些是请求层单元证据，不能替代浏览器中的错误文案、按钮状态、取消路径和权限页面证据。

### 本轮结论

本轮关闭了当前 V4 Workload Store/API 的静态定位未知：三类资源的作用域 URL、详情/Watch、PATCH 更新、Background 删除、关联 HPA 和 StatefulSet Service PATCH 均已绑定文件与行号。仍未关闭的内容为：真实 V3/V4 Network 请求、DaemonSet 停止语义、完整字段 payload、RBAC 正反权限、列表/详情缓存失效、错误/取消 UI、跨 namespace 隔离和浏览器渲染。阶段仍为 `REA / 分析中`，不进入 DEV。

## 旧源码字段清单（用于当前 V4 逐项对照）

以下清单来自固定旧源码候选，不表示当前 V4 已实现或已验收；它用于把后续 REA 和测试拆成可核对的字段组。

| 旧源码文件                                                                     | 已定位的能力组                                                                                                                   | 三类资源差异或验证重点                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/components/Forms/Workload/BaseInfo/index.jsx`                             | 名称、别名、项目、描述；名称格式、别名格式、名称存在性和联邦项目校验                                                             | 编辑场景中项目不可随意切换；当前 V4 只读 namespace 与旧字段保留语义仍需验证                         |
| `src/components/Forms/Workload/ContainerSettings/index.jsx`                    | 副本数、配额/LimitRange、容器和初始化容器列表、容器级表单、Pod 安全上下文、终止宽限期、更新策略、元数据                          | StatefulSet 使用 `withService: true`；DaemonSet 不应套用 Deployment 副本数停止假设                  |
| `src/components/Forms/Workload/ContainerSettings/ContainerForm/index.jsx`      | 端口、镜像拉取策略、健康检查、生命周期、命令/参数、环境变量、SecurityContext、时区                                               | 当前 V4 `ContainerInput` 已覆盖部分字段；全部探针、生命周期、安全上下文、时区和清空语义仍需逐项对照 |
| `src/components/Forms/Workload/VolumeSettings/index.jsx`                       | PVC、临时卷、HostPath、ConfigMap/Secret 引用、挂载配置、日志配置；StatefulSet 的 `volumeClaimTemplates`                          | STS 的卷模板及卷挂载不能被普通 `spec.volumes` 取代；当前 V4 需要确认来源保留、删除和空值写入        |
| `src/components/Forms/Workload/AdvanceSettings/index.jsx`                      | 网络模块启用时的 Pod IP 池、节点选择（DaemonSet 排除）、元数据                                                                   | IP 池依赖集群模块；节点选择对 DaemonSet 的旧源码行为是明确差异，需保留为独立用例                    |
| `src/components/Forms/Workload/ContainerSettings/UpdateStrategy/index.jsx`     | 更新策略选择；Deployment 的 `maxUnavailable/maxSurge`，StatefulSet 的 `partition`，DaemonSet 的 `maxUnavailable/minReadySeconds` | 旧源码存在模块级默认值和类型校验；当前 V4 尚未形成同等表单和 payload 证据                           |
| `src/components/Forms/Workload/ContainerSettings/TerminationSeconds/index.jsx` | `spec.template.spec.terminationGracePeriodSeconds`，默认值 30                                                                    | 当前 V4 Settings Modal 未提供该字段；需要明确缺失、默认值和保留语义                                 |

当前 V4 `WorkloadSettingsModal.tsx` 只展示名称、namespace、replicas、容器、初始化容器和卷；上表中更新策略、节点选择/IP 池、元数据、Service、终止宽限期、StatefulSet 卷模板、完整容器高级字段尚未进入该 Modal。该差异是已确认的 DEV 入口缺口，不在 REA 阶段直接补代码；需先完成每一组字段的当前制品/旧源码/运行时证据和对应测试设计。

## 当前制品中的表单注册边界补充

对 `packages/bootstrap/assets/v3dist/3.bb6cbee4309e765b70c1.js` 直接读取后，发现同一 bundle 中存在两套容易混淆的 forms 注册：

- 普通项目设置链路由工厂 `3595` 的 `workload.template.edit`、Modal 工厂 `3601` 和注册表工厂 `3602` 串联。`3602` 明确登记 `deployments`、`statefulsets`、`daemonsets` 三类普通资源；其中 Deployment 有 `deploymentMode`，StatefulSet 有 `deploymentMode`，DaemonSet 没有该分区。三类资源的注册差异不能只靠共享表单名称推断字段等价。
- `3595` 的普通项目处理从 `detail._originData` 取编辑对象，清理 `spec.template.spec.customMode` 后调用 `store.update`；StatefulSet 额外传递 `hideVolumeSetting`。这证明了普通入口的 Action 参数和保存处理，仍不能替代底层字段、校验和运行时请求验证。
- 联邦入口的 `spec.overrides` 处理和 `hideVolumeSetting` 传递属于另一条入口，不能把联邦表单注册当成普通项目证据。

因此，普通项目 DaemonSet 的设置入口必须继续用其详情路由、调用参数和实际页面/Network 证据单独确认。此前“当前制品存在 DaemonSet 分区”的结论只适用于已定位的集群差异注册，不能替代普通项目编辑设置的等价性证明。

## 131 浏览器运行时取证状态

本轮按专用测试账号从 `http://192.168.2.131:30880/login` 进行只读登录尝试，页面返回“用户名或密码错误”。没有继续进行路由、Network、页面渲染或资源操作，也没有部署、修改集群资源或创建新账号。该结果只能说明当前会话没有取得有效登录，不代表 V4 功能失败；V3 页面和 V4 当前制品的运行时 REA 仍未完成，后续需要可用的测试登录会话后再采集。
