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

| 能力                 | 当前 V4 证据                                                                                                                                                                                                                                               | 当前结论                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 项目/集群列表        | `packages/shared/src/hooks/useUrl/index.ts:85-87` 生成 `kapis/resources.kubesphere.io/v1alpha3` 加 cluster、workspace 或 namespace 路径；`packages/shared/src/stores/store.ts:67-101` 将 `cluster`、`namespace` 从查询参数中拆出后请求                     | 具备作用域参数入口；仍需浏览器 Network 证明项目列表没有越界到全量资源                                                     |
| Kubernetes 列表/创建 | `useUrl/index.ts:97-102` 使用 `getApiVersion(module, k8sVersion)` 加 namespace 路径；`store.ts:151-153` 的 `post` 使用同一列表 URL                                                                                                                         | URL 构造可追溯；API 版本、RBAC 403 和创建后的列表刷新尚未在三类资源上逐项验证                                             |
| 详情/Watch           | `useUrl/index.ts:89-109` 从同一列表 URL 派生详情 URL 和 Watch URL；三类详情分别调用 `store.getWatchListUrl({cluster, namespace})` 并在事件后 `refetch()`                                                                                                   | 详情和 Watch 带作用域；Watch 失败、断线重连和直达 URL 仍需运行时证据                                                      |
| 编辑设置             | `packages/shared/src/stores/workload/index.ts:147-151` 的 `useUpdateDeploymentMutation` 调用 `BaseStore.patch`；`packages/shared/src/stores/store.ts:199-205` 使用详情 URL发送 PATCH                                                                       | 当前 V4 与旧源码 `store.update` 的 PUT + 资源版本注入不同；必须以实际 payload、resourceVersion 冲突和字段保留结果证明等价 |
| 删除                 | `workload/index.ts:108-115` 使用详情 URL和 `DeleteOptions`，传播策略为 `Background`；带关联 HPA 时先加入 HPA 删除请求                                                                                                                                      | 删除链路有静态证据；多选、关联 HPA、403/404、取消和删除后列表刷新仍未分别验证                                             |
| StatefulSet Service  | `packages/console/src/pages/clusters/hooks/useModal/useWorkloadService.tsx:14-39` 通过 `serviceStore.patch(detail, data)` 保存；`packages/shared/src/stores/service.ts:163-180` 对 Service 详情发 PATCH；项目详情仍由 `StatefulSets/Detail/index.tsx` 触发 | 已确认原生 Service Store 入口；Headless/Selector payload、权限拒绝、错误提示和保存后详情刷新未闭环                        |

### 旧 V3 与当前 V4 的请求差异

固定旧源码 `origin/release-3.4`（`175710fefeeba6ff295c2c0967b4d45b83563d26`）的 `src/stores/base.js:253-267` 显示，编辑设置历史路径先 GET 详情读取 `metadata.resourceVersion`，再使用 PUT 写回完整对象；当前 V4 `WorkloadStore` 的编辑设置路径使用 PATCH，且当前已定位代码没有在该 mutation 中显式注入资源版本。这个差异不能直接判定为缺陷，也不能直接判定为等价，必须在真实环境记录请求方法、请求体、并发更新和未编辑字段保留结果。

旧源码的删除路径还会以 Background 传播策略删除资源，并在关联 HPA 时追加 HPA 删除请求；当前 V4 保留了这条静态关系，但 `batchDelete` 的参数、cluster 传递和成功后列表刷新需要单独验证。旧源码 `stop` 对 DaemonSet 使用不可调度的 nodeSelector，而当前 V4 当前 Workload Store 的 `stopDeployment` 固定向 `spec.replicas` 写入 0；这属于高风险资源差异，不能把 Deployment 的停止行为复用为 DaemonSet 通过证据。

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
