# Workload Action、API、权限与缓存 REA 证据

> **2026-10-24 当前源码纠偏：** 本文早期静态记录中的“StatefulSet/DaemonSet 编辑设置仍调用 `editYaml`”属于旧制品快照。当前 `feature/v4-workloads@9767ad7c2` 的三个详情页均通过原始资源读取和 `WorkloadSettingsModal` 提供原生编辑设置，YAML 是独立 Action。Action/API/RBAC、缓存和浏览器缺口仍然保留，最新复核见[Workload 组合批次 REA 复核记录](./workload-rea-review-20261024.md)。

## 1. 取证身份与结论边界

| 项目         | 内容                                         |
| ------------ | -------------------------------------------- |
| 模块         | `workloads`                                  |
| 资源         | Deployment、StatefulSet、DaemonSet           |
| 当前分支     | `feature/v4-workloads`                       |
| 当前代码提交 | `ef2b03aac646545d3703c1b51e39c5a23b63df44`   |
| 当前阶段     | `REA` / 分析中，待负责人复核                 |
| 取证类型     | 当前源码静态分析；未将静态结果当作运行时通过 |

本文记录当前代码中可以直接复核的 Action、Store/API、权限、作用域、缓存和错误处理事实。它不能证明 Kubernetes API 的实际授权结果、浏览器页面行为、请求成功或缓存隔离已经通过；这些仍需进入 DEV/VERIFY 后，在当前 SHA 的制品上验证。

## 2. 入口与 Action 权限

### 2.1 详情页权限过滤

`packages/shared/src/hooks/useActions/useDetailActions.tsx:47-63` 调用 `useEnabledActions` 过滤详情操作。`packages/shared/src/hooks/useActions/utils.ts:47-58` 将 `authKey` 作为 `module`，并把 `params.namespace` 映射为 `project`。

三类项目级详情页均设置 `authKey = module`，因此当前权限键分别为：

| 资源        | module/authKey | 项目级作用域参数               |
| ----------- | -------------- | ------------------------------ |
| Deployment  | `deployments`  | `cluster`、`namespace`、`name` |
| StatefulSet | `statefulsets` | `cluster`、`namespace`、`name` |
| DaemonSet   | `daemonsets`   | `cluster`、`namespace`、`name` |

`packages/shared/src/utils/nav.ts:177-244` 的 `getActions` 按优先顺序读取项目规则、DevOps 规则、Workspace 规则、Cluster 规则或全局规则，并把 `manage` 展开为 `view/edit/create/delete`。这说明了前端动作显示的静态决策路径，但没有证明服务端对每个 HTTP 请求使用了同样的授权边界。

### 2.2 当前详情操作矩阵

| 操作                | Deployment                                     | StatefulSet                                | DaemonSet | 当前实现事实                                                                 |
| ------------------- | ---------------------------------------------- | ------------------------------------------ | --------- | ---------------------------------------------------------------------------- |
| 编辑基础信息        | `edit`                                         | `edit`                                     | `edit`    | 通过 `store.patch` 更新详情                                                  |
| 回滚                | `edit`                                         | `edit`                                     | `edit`    | 通过 `useRollbackMutation` 发起 PATCH                                        |
| HPA                 | `edit`，受 metrics-server 和自定义伸缩状态影响 | 同左                                       | 未提供    | DaemonSet 代码中的 HPA 操作仍为注释                                          |
| 编辑设置            | `edit`                                         | `edit`                                     | `edit`    | Deployment 打开原生设置；StatefulSet/DaemonSet 当前仍调用 `editYaml(detail)` |
| 编辑 YAML           | `edit`                                         | `edit`                                     | `edit`    | 三类资源均调用公共 YAML 编辑器                                               |
| 重新部署/重启       | `edit`                                         | `edit`                                     | `edit`    | 通过 PATCH 写入 `kubesphere.io/restartedAt`                                  |
| 删除                | `delete`                                       | `delete`                                   | `delete`  | 通过 workload store 的后台删除逻辑                                           |
| StatefulSet Service | 无                                             | `edit`，仅在 `spec.serviceName` 存在时显示 | 无        | 调用 Headless Service 编辑入口                                               |

证据文件：

- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx:278-358`
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/index.tsx:249-313`
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/index.tsx:220-276`

### 2.3 已确认的功能等价风险

- StatefulSet 的“编辑设置”和 DaemonSet 的“编辑设置”目前与“编辑 YAML”使用同一回调，不能视为旧 V3 设置页面的原生替代。
- `packages/shared/src/stores/workload/index.ts:181-209` 的 `stopDeployment` 对所有 workload module 都写入 `spec.replicas: 0`。DaemonSet 没有 Deployment/StatefulSet 的 replicas 语义，停止、恢复和批量停止必须在 DEV 中拆分并验证。
- 集群级 `/clusters/{cluster}/deployments`、`statefulsets`、`daemonsets` 仍由 `Workloads/Embed` 生成 `/consolev3/clusters/...` 并渲染 `WujieReact`；详情页静态原生化不能覆盖这一入口。

## 3. API 与 Store 请求边界

### 3.1 URL 与 HTTP 方法

`packages/shared/src/stores/store.ts:65-109,145-205` 和 `packages/shared/src/utils/urlHelper.ts:9-58` 给出当前请求构造：

| 场景         | 方法     | URL 形态                                                                                    | 备注                                                                                     |
| ------------ | -------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 项目资源列表 | `GET`    | `kapis/resources.kubesphere.io/v1alpha3/klusters/{cluster}/namespaces/{namespace}/{module}` | `fetchList` 将 `cluster`、`namespace` 从查询参数移出，资源范围由 URL 决定                |
| 详情         | `GET`    | 上述列表 URL `/{name}`                                                                      | `useGetDetail` 的 React Query key 是 `[module, params]`                                  |
| 创建         | `POST`   | Kubernetes `apiVersion + path + /{module}`                                                  | 由基础 Store `post` 发送                                                                 |
| 原生编辑设置 | `PATCH`  | 详情 URL                                                                                    | Deployment 当前设置保存调用 workload store patch                                         |
| YAML 编辑    | `PUT`    | 详情 URL                                                                                    | 保存前默认重新 GET 详情并补 `metadata.resourceVersion`                                   |
| 删除         | `DELETE` | 详情 URL                                                                                    | workload store 携带 `DeleteOptions` 和 `propagationPolicy: Background`                   |
| 回滚         | `PATCH`  | 详情 URL                                                                                    | Deployment 使用 `application/json-patch+json`，StatefulSet/DaemonSet 未设置该专用 header |

以上是源码中确认的请求形态，不是当前 SHA 的实际 Network 记录。错误状态、服务端 RBAC、版本冲突和 API 聚合层的响应仍需 VERIFY。

### 3.2 删除、HPA 与并发更新

- Workload 删除会先处理 `kubesphere.io/relatedHPA`，再删除 Workload；批量删除通过 `Promise.allSettled` 汇总，任一 rejected 会被 `settleWorkloadRequests` 抛出。
- 基础 Store 的 `put` 会先读取当前 `metadata.resourceVersion`，用于避免无版本更新；Deployment 设置入口另外保留原始资源快照，失败时将 409 映射为冲突提示。
- 当前公共 `useCommonActions` 在编辑、YAML 和删除成功后只调用 `invalidateResourceList(store.module)`；没有在该路径显式调用 React Query `invalidateQueries`。

## 4. 缓存、作用域与错误状态

| 项目             | 已确认事实                                                                              | 尚未证明                                                                         |
| ---------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 详情查询 key     | `useGetDetail` 使用 `[module, params]`，其中 `params` 为对象                            | 需要实测 cluster/namespace/user 切换后是否不会复用旧数据                         |
| 列表刷新         | 公共操作递增按资源类型保存的 revision                                                   | 需要证明实际列表订阅了 revision，并且 revision 不会跨 namespace 误刷新或泄露数据 |
| 资源作用域       | URL 由 `cluster` 和 `namespace` 构造；项目权限由 `params.namespace` 进入 `projectRules` | 需要用不同 namespace、低权限账号和实际 API 响应验证正反隔离                      |
| 403/404/网络失败 | Store 测试和部分页面错误分支已有静态/单测输入                                           | 没有当前 SHA 部署后的逐项浏览器错误态证据                                        |
| 409 冲突         | 原生 Deployment 设置组件区分 409 与普通保存失败                                         | StatefulSet/DaemonSet 原生设置尚未接入，且需要当前制品的真实冲突路径             |
| 取消操作         | 详情页 modal 和 YAML 编辑器有取消入口                                                   | 尚未完成三类资源逐项浏览器验证，不能宣称取消路径等价                             |

## 5. REA 状态结论

| 高风险项                        | 当前结论                     | 依据                                                                                        |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| WL-01 入口与页面分区            | 部分确认，未闭环             | 项目详情操作已定位；集群列表仍为 V3/Wujie，StatefulSet/DaemonSet 设置入口未原生化           |
| WL-02 字段与写入语义            | 未关闭                       | 当前 Modal 仍是公共 Deployment 形态，缺少 StatefulSet/DaemonSet 专属字段和完整清空/保留验证 |
| WL-03 Action/API/RBAC/缓存/错误 | 静态链路已定位，运行时未闭环 | 本文完成源码矩阵；未完成当前 SHA 的 API、RBAC、隔离、缓存和浏览器证据                       |
| WL-04 配置引用 V3 桥接          | 已确认实现缺口               | ConfigReference 仍使用 `useV3action`、Wujie Shadow DOM 和 V3 编辑器实例                     |

**结论：当前 REA 材料不足以放行 DEV。阶段保持“分析中，待负责人复核”，`rea.review` 保持 `null`。** 本次复核不修改业务代码、不构建、不部署，也不把静态证据写成测试通过。

## 6. 后续进入 DEV 前的最小闭环

1. 由负责人对当前 REA 材料进行独立复核并留下可追溯签署记录。
2. 在允许进入 DEV 后，先实现三类资源原生设置入口和配置引用原生路径，明确 DaemonSet 停止语义。
3. 为 Action/API/RBAC/作用域/缓存/错误矩阵补当前 SHA 的单测、部署后 Network 和 Playwright 证据。
4. 集群级 Workload 列表的 V3/Wujie 依赖单独纳入本模块开发范围，不能因项目详情页原生化而关闭。
