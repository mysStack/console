# Deployment V3 / V4 证据记录

> 2026-10-22 最新进展：源码 `2a2aeb4f4` 对应制品已在 131 完成多个工作/初始化容器、普通环境变量、端口的限定 VERIFY，25 个浏览器检查点通过。旧源码仍是不完整行为参考，focused REA 仍为 partial；完整创建及模块验收尚未完成。详见[容器设置验证记录](./deployment-containers-131-verify-20261022.md)。以下第一批记录为历史快照。

> 2026-10-22 最新模块进展：项目 Workload 列表已进入 DEV/VERIFY。Deployment 原生创建第一批已在提交 `a05a96518` 对应制品上完成 131 浏览器验证，创建、取消、409 错误、刷新、原生详情、返回、UI 删除和缓存刷新通过；多容器、存储、调度、安全等完整 V3 创建能力尚未实现，模块不标记已验收。详见[原生创建验收记录](./deployment-create-131-verify-20261022.md)和[操作验收记录](./workload-actions-131-verify-20261022.md)。

> 事实检查日期：2026-10-16；文档复核日期：2026-10-17
> 仓库：`mysStack/console`  
> 分支：`feature/v4-migration`  
> 基线：`fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`

当前证据包以源码静态分析为主，属于 P0/P3-REA 输入，不代表 P3-REA 已通过。第一轮 `v3dist` REA 的 Evidence ID、覆盖范围和限制记录在[REA 阶段分析总结](./rea-analysis-summary.md)。除非明确标为“已验证”，浏览器请求、响应内容、权限和操作结果都必须等部署到授权的 131 测试环境后再确认。

## 路由映射

### 项目范围

证据文件：`packages/console/src/pages/projects/routes/index.tsx` 和 `routes/detail.tsx`。

| 宿主路由                                                              | 当前实现                                                     | 子路由行为                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `/:workspace/clusters/:cluster/projects/:namespace/deployments`       | `containers/Deployments/index.tsx` → `ConsoleV3ResourceList` | V3 列表负责分页、搜索和列表导航                |
| `/:workspace/clusters/:cluster/projects/:namespace/deployments/:name` | `containers/Deployments/Detail/index.tsx` → `WujieReact`     | `BaseLayout/route.ts` 将 V3 详情路由同步到宿主 |
| `.../:name/resource-status`                                           | `containers/Deployments/Detail/routes.tsx` 占位子路由        | 实际 V3 子页面在 Wujie 应用中渲染              |
| `.../:name/revision-control`                                          | 同上                                                         | V3 版本记录页面                                |
| `.../:name/metadata`                                                  | 同上                                                         | V3 元数据页面                                  |
| `.../:name/monitors`                                                  | 同上                                                         | 启用监控时显示的 V3 监控页面                   |
| `.../:name/env`                                                       | 同上                                                         | V3 环境变量页面                                |
| `.../:name/config-reference`                                          | `components/ConfigReference/ConfigReferencePage`             | 宿主原生页面，工作负载数据来自 V4 Store        |
| `.../:name/events`                                                    | 同上占位子路由                                               | V3 事件页面                                    |

### 集群范围

证据文件：`packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx`、`containers/ApplicationWorkloads/Workloads/index.tsx` 和 `containers/Workload/Deployments/`。

| 宿主路由                                                       | 当前实现                                                    | 状态                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `/clusters/:cluster/deployments`（通过 Application Workloads） | `WorkloadList` / `ApplicationWorkloads/Workloads/index.tsx` | V4 列表源码存在；路由和 Tab 行为待浏览器验证 |
| `/clusters/:cluster/projects/:namespace/deployments/:name`     | `Workload/Deployments/Detail/index.tsx`                     | V4 详情源码存在                              |
| `.../:name/resource-status`                                    | `Workload/Deployments/Detail/ResourceStatus`                | V4 组件存在                                  |
| `.../:name/revision-control`                                   | `RevisionControl`                                           | V4 组件存在                                  |
| `.../:name/metadata`                                           | `Metadata`                                                  | V4 组件存在                                  |
| `.../:name/env`                                                | `EnvVariables`                                              | V4 组件存在                                  |
| `.../:name/events`                                             | `Events`                                                    | V4 组件存在                                  |

集群路由存在并不等于功能已经完全等价：项目范围仍然解析到 V3 列表/详情，集群路由注册中还保留历史 V3 Embed 相关代码。必须在浏览器证据中记录实际访问 URL 和最终渲染组件。

## API 和 Store 证据

证据文件：`packages/shared/src/hooks/useUrl/index.ts`、`packages/shared/src/constants/common.ts`、`packages/shared/src/stores/base.ts` 和 `packages/shared/src/stores/workload/index.ts`。

对项目范围 Deployment `{ cluster, namespace, name }`，V4 Store 当前解析出以下调用：

| 场景                     | 方法         | URL 形态                                                                                     | 源码                                                               |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 资源列表                 | GET          | `kapis/resources.kubesphere.io/v1alpha3/klusters/:cluster/namespaces/:namespace/deployments` | `BaseStore.fetchList` / `getResourceUrl`                           |
| Kubernetes 列表          | GET          | `apis/apps/v1/klusters/:cluster/namespaces/:namespace/deployments`                           | `getListUrl`、`API_VERSIONS.deployments`                           |
| 详情                     | GET          | 列表 URL + `/:name`                                                                          | `BaseStore.fetchDetail`、`workloadStore.useGetDetail`              |
| 更新 / YAML / 配置 Patch | PUT 或 PATCH | 详情 URL                                                                                     | `BaseStore.put/patch`、`workloadStore.useUpdateDeploymentMutation` |
| 删除                     | DELETE       | 带 `DeleteOptions` 请求体的详情 URL                                                          | `workloadStore.del` / `useDeleteDeploymentMutation`                |
| 停止 / 伸缩              | PATCH        | 详情 URL，请求体包含 `spec.replicas`                                                         | `stopDeployment`、`useBatchStopDeploymentMutation` 和自动伸缩弹窗  |
| 回滚                     | PATCH        | 详情 URL；Deployment 使用 `application/json-patch+json`                                      | `workloadStore.useRollbackMutation`                                |
| 重启 / 重建              | PATCH        | 详情 URL，请求体设置 `spec.template.metadata.annotations.kubesphere.io/restartedAt`          | 项目和集群详情组件                                                 |
| Watch                    | GET          | `apiVersion/watch` + 作用域 + `/deployments/:name`                                           | `useUrl.getWatchUrl`；具体调用方待确认                             |

V3 列表和详情请求隐藏在编译后的 `v3dist` 应用和 Wujie 子应用中，不能只从 V4 包装器推断准确的 method/path/query/body 和响应转换。需要在浏览器 Network 中采集脱敏请求。

## Store、缓存和路由生命周期

- `workloadStore('deployments')` 包装共享 `BaseStore`，并使用 `ObjectMapper.deployments` / `WorkLoadMapper` 转换数据。
- 详情查询当前使用 React Query key `[module, params]`；原生项目列表/详情实现必须保留 `params` 中的完整作用域。
- 操作成功后通过 `refetch` 或列表表格的 refetch 回调刷新数据。迁移必须保留编辑、伸缩、回滚、重启和删除后的列表失效行为。
- 项目 Deployment 详情当前通过 `bindConsoleV3DetailHistory` 将宿主历史绑定到 Wujie 子应用，等待子应用根节点稳定后再同步路由，并在超时后记录错误。这是迁移到 V4 时应消除的生命周期风险。

## 操作链和当前缺口

当前 `containers/Deployments/Detail/index.tsx` 中的项目详情操作：

1. 编辑基础信息 → `useCommonActions.editBaseInfo`。
2. 回滚 → `useRollbackModal` → `useRollbackMutation`。
3. 编辑自动伸缩 → `useAutoScalingModal` → 工作负载/HPA Mutation。
4. 编辑设置/容器模板 → `useV3action`，参数为 `v3Module: 'workload'`。
5. 编辑 YAML → `useCommonActions.editYaml`。
6. 重建 → Patch 重启注解。
7. 删除 → `useDeleteDeploymentMutation`，同时清理关联 HPA。

第 1、2、3、5、6、7 项已有 V4 Store 或共享 Action 候选。第 4 项在当前基线上明确依赖 V3，必须替换后才能将 Deployment 标记为“已验收”。

## 证据状态

| 项目                    | 状态         | 必需证据                        |
| ----------------------- | ------------ | ------------------------------- |
| 源码路由和组件映射      | **已验证**   | 本文档和源码路径                |
| V4 API method/path 映射 | **静态推断** | Store 单测和浏览器 Network 采集 |
| V3 API 和隐藏 Action    | 待实测       | 131 部署制品的脱敏 Network 采集 |
| RBAC 操作可见性         | 待实测       | 管理员和受限测试账号            |
| 前进/后退/刷新/直达 URL | 待实测       | Playwright 路由矩阵             |
| 数据失效和作用域隔离    | 待实测       | 跨项目/集群变更回归             |

## 阶段门禁

- [ ] P0-REA：旧 V3 源码基线、全量启用路由/扩展和动态 Action 未完成。
- [ ] P3-REA：Deployment 的旧 V3 行为、关键 Action、API、RBAC、缓存和运行时 Network 矩阵未完成。
- [x] P3-DEV：已开始；项目列表、部分操作和 Deployment 原生创建第一批已实现。
- [ ] P3-VERIFY：原生创建第一批通过，完整创建能力、RBAC、作用域和全部动作等价仍未完成。

## 2026-10-21 第一批原生重构输入：项目 Workload 列表

本轮把旧源码和当前 V4 代码正式整理为第一批重构输入，范围限定为项目 Deployment、StatefulSet、DaemonSet 列表。旧源码基线为 `origin/release-3.4` 的 `175710fefeeba6ff295c2c0967b4d45b83563d26`。

### V3 已确认行为

旧版 `src/pages/projects/containers/Deployments/index.jsx` 通过 `withProjectList` 使用 `WorkloadStore('deployments')`，项目路由前缀固定为 `/:workspace/clusters/:cluster/projects/:namespace`，列表提供：

- Deployment、StatefulSet、DaemonSet 三个 Tab，切换时保持 workspace、cluster 和 namespace；
- 名称、状态、应用和更新时间列，名称进入对应资源详情；
- 搜索、排序、状态过滤和分页；
- 创建、编辑基础信息、编辑 YAML、重建、删除、批量删除和 Deployment 批量停止；
- 状态原因优先于描述文本，联邦托管资源保留多集群标识并限制部分写操作。

`origin/release-3.4:src/actions/workload.js` 进一步确认了三类资源的行为差异：StatefulSet 创建时关联 Headless Service；Deployment/StatefulSet 支持模板编辑和自动扩缩；DaemonSet 不应凭空增加 HPA；重建通过 `spec.template.metadata.annotations.kubesphere.io/restartedAt` 更新；删除需要保留关联 HPA 清理和 DeleteOptions 传播语义。

### V4 重构映射

| V3 行为                    | 当前 V4 复用来源                                                                         | 第一批动作                            |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| 项目 namespace 固定列表    | `useParams`、`workloadStore.getResourceUrl({ cluster, namespace })`                      | 列表不得显示跨 namespace 选择器       |
| 列表映射/状态/更新时间     | `WorkloadMapper`、`WorkloadStatus`、`formatTime`                                         | 保留当前列语义和空态/错误态           |
| 列表动作                   | `workloadStore` mutations、`useItemActions`、`useBatchActions`                           | 逐项替换 V3 Action                    |
| 详情导航                   | `ApplicationWorkloads/Workloads/{Deployments,StatefulSets,DaemonSets}/Detail/routes.tsx` | 保留 workspace/cluster/namespace/name |
| YAML、重建、删除、配置引用 | `useCommonActions`、原生 Detail、`ConfigReferencePage`                                   | 复用现有 V4 实现并补回归              |

在本轮改造前，项目列表直接使用 `ConsoleV3ResourceList`，这是本轮确认并处理的 V3 缺口；本节只作为开发输入，不代表原生化已完成。

2026-10-21 本地 DEV 已将项目 Deployment、StatefulSet、DaemonSet 列表切换为现有 V4 `workloadStore`、`DataTable`、`WorkloadStatus` 和原生详情路由，相关文件分别为 `packages/console/src/pages/projects/containers/{Deployments,StatefulSets,DaemonSets}/index.tsx`。同时修正 `WorkloadBanner` 按当前完整 pathname 切换 Tab，避免项目路由退回 cluster 级路径。该实现目前只证明列表代码链路，创建按钮仍为空回调，不能推导出 V3 创建、编辑、YAML、重建、删除和批量动作已全部等价。

### REA 与运行时校准

当前 `v3dist` 重新执行 REA 的摘要证据为 `ev_fcff357b62b59dde503f98837df84bb87e06ba6db2a48c7616ec1bda2ac6c9c8`，制品 SHA-256 为 `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4`。REA 结果覆盖 440 个相关文件和 434 个 JavaScript 文件，但语义图存在资源限制和未知项，因此只用于定位差异，不替代旧源码和浏览器验证。

当前 131 浏览器证据仍观察到项目 Workload 列表加载 `/consolev3/dashboard`，StatefulSet、DaemonSet 还出现具体 `/consolev3/...` 请求。第一批完成条件是项目三个列表改为 V4 原生请求，并在部署后的 Network 中确认不再出现对应的 V3 列表请求；此项尚未执行。

## 2026-10-22 Deployment 原生创建 focused REA 与运行时校准

当前 `v3dist` SHA-256 为 `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4`。本轮 focused REA 的完整收据 `ev_06201f7208bb80a18d8c1dfe8ffa4d35140e7d47bc4c080185660378f62c1c1f`（父证据 `ev_262589fd4558a51d78ac7dc539d4936246e06ae39737683903e905b72a7fde36`）覆盖 `main.558...`、`3.bb6...`、`12.2...` 三个创建相关 Chunk。结果确认 `workload.create` 入口、基础信息标签同步、`apps/v1` Deployment 模板、默认 ServiceAccount 和 RollingUpdate `25%/25%`，但主 Chunk 语义分析受 worker 堆内存限制，结论为 `partial`。

`origin/release-3.4` 只作为旧行为参考，用于补充基础信息、容器、存储和高级设置四步流程，不能当成当前制品的完整对应源码。当前 V4 第一批只实现名称、别名、描述、副本、单容器名称/镜像/拉取策略；完整差异保留在缺口矩阵。

源码 `a05a96518` 的 CI Run `39722386439` 成功，131 Pod 实际 imageID 为 `sha256:842c057345bfcea3edb6af388ff8db5b3260fc98b6f813a8f7f7b7195235da24`。真实浏览器创建返回 `201`，重复名称返回 `409` 且显示错误，UI 删除返回 `200`；创建与详情流程无 `/consolev3` 请求。该证据关闭原生创建第一批链路，不关闭完整 V3 功能等价。
