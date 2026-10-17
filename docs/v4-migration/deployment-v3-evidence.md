# Deployment V3 / V4 证据记录

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
- [ ] P3-DEV：未开始正式开发；现有 V4 代码和本文件仅作为对照输入。
