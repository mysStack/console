# Deployment V3 / V4 缺口矩阵

> 历史事实基线：`release-4.1.5` / `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`；当前复核：2026-10-22。下表保留原始缺口，最新进展见文末。按负责人批准的模块级门禁继续 DEV/VERIFY；全局 P0 未闭环不统一阻塞本模块，已有代码和本地测试不代表模块验收。

> 第一轮 `v3dist` REA 的 Evidence ID、覆盖范围和限制见[REA 阶段分析总结](./rea-analysis-summary.md)；Deployment 的路由、API、Store 和操作链见[Deployment V3/V4 证据记录](./deployment-v3-evidence.md)。

| V3 能力                | 当前 V3 证据                                                             | V4 候选实现                                                               | 缺口 / 决策                                 | 验收场景                                         | 状态   |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ | ------ |
| 项目列表分页/搜索/排序 | `projects/containers/Deployments/index.tsx` 使用 `ConsoleV3ResourceList` | `ApplicationWorkloads/Workloads/index.tsx` + `ListPage` + `workloadStore` | 重接项目路由，同时保留 namespace 和查询状态 | 打开项目列表，搜索、排序、分页、刷新并返回       | 待开发 |
| 项目列表进入详情       | V3 列表负责导航                                                          | 原生 `routes/detail.tsx` 和 Deployment 详情                               | 确认 URL 可直达且不再挂载 V3 子应用         | 点击行、复制 URL、直达、刷新、前进/后退          | 待开发 |
| 详情资源状态           | V3 子路由 `resource-status`                                              | `Workload/Deployments/Detail/ResourceStatus`                              | 对齐状态卡片和空态/错误态                   | 就绪、更新中、失败和资源不存在场景               | 待开发 |
| 版本记录/回滚          | V3 `revision-control` 和隐藏 Action                                      | `RevisionControl`、`useRollbackMutation`、回滚弹窗                        | 确认版本列表响应和 JSON Patch 结构          | 查看版本、选择版本、确认回滚、验证列表和详情刷新 | 分析中 |
| 元数据和事件           | V3 子路由                                                                | `Metadata`、`Events`                                                      | 对齐字段、事件顺序和分页                    | 刷新后打开两个 Tab，并支持直达                   | 待开发 |
| 监控                   | 启用模块时使用 V3 `monitors`                                             | `Monitoring`                                                              | 确认模块/RBAC 可见性和查询结构              | 监控模块启用和关闭两种场景                       | 待开发 |
| 环境变量               | V3 `env`                                                                 | `EnvVariables`                                                            | 保留容器范围和 Secret 脱敏                  | 查看 ConfigMap/Secret 环境变量，不暴露值         | 待开发 |
| 配置引用               | 宿主已有原生路由                                                         | `ConfigReferencePage`、`ConfigReferencePanel`                             | 验证保存、预览、文件挂载和选择性重启        | 增删引用、预览 key、保存、重新打开详情           | 分析中 |
| 编辑基础信息           | V3 宿主详情调用 `useCommonActions.editBaseInfo`                          | 现有共享 Action 和原生详情                                                | 验证字段和校验与 V3 一致                    | 编辑合法/非法元数据并验证请求和刷新              | 分析中 |
| 编辑 YAML              | `useCommonActions.editYaml`                                              | 现有共享 Action 和原生详情                                                | 验证 resourceVersion、校验和错误显示        | 编辑 YAML，拒绝非法 YAML，保存合法 YAML          | 分析中 |
| 容器/模板设置          | `useV3action`，参数为 `v3Module: workload`                               | 新建原生容器/模板弹窗                                                     | 先完成 V3 Action 清单；当前没有等价原生弹窗 | 打开每个设置区，编辑环境变量/端口/资源/卷并保存  | 未确认 |
| 自动伸缩               | `useAutoScalingModal` 和 HPA Mutation                                    | 现有 HPA Store/弹窗                                                       | 检查自定义伸缩保护和关联 HPA 行为           | 在不同 RBAC 下启用、停用、更新 HPA               | 分析中 |
| 重建/重启              | Patch 重启注解                                                           | 现有 `RecreateModal` 和 Mutation                                          | 验证时间格式和 Rollout 结果                 | 确认重建，观察新 Pod 和更新后的详情              | 分析中 |
| 删除                   | V3 Action 路径及关联 HPA 清理                                            | `useDeleteDeploymentMutation`                                             | 验证传播策略和导航                          | 删除工作负载，确认列表移除和关联 HPA 清理        | 分析中 |
| RBAC 和联邦限制        | V3 Action 可见性及 `isFedManaged` 判断                                   | `useActionMenu`、原生详情操作                                             | 对齐每个操作的权限和禁用状态                | 管理员、项目成员、联邦托管资源                   | 待实测 |
| 缓存和作用域隔离       | V3 子应用有宿主/Wujie 生命周期和共享缓存                                 | React Query key 和 Store 参数                                             | 证明没有跨项目/集群详情泄漏                 | 切换 namespace/集群/用户并修改一个工作负载       | 待实测 |

## 晋级关卡

2026-10-21 起，第一批实现范围收敛为项目 Deployment、StatefulSet、DaemonSet 列表。旧 V3 列表源码和 `workload.js` 行为已整理到 [Deployment V3/V4 证据记录](./deployment-v3-evidence.md)；下一步按实施计划先写三个列表的失败测试，再实现 V4 原生列表。详情页、容器模板设置、完整 RBAC、失败/取消路径和跨 namespace 证据仍不能由列表切换自动推断。

2026-10-21 本地 DEV 已完成列表数据链路迁移和路由作用域改造。创建入口当前仍为空回调，创建表单、动作逐项等价、部署后 Network、namespace 隔离和 RBAC 仍为未验收项；本批状态为“开发完成，待部署验证”，不是“已验收”。

Deployment 已按模块级门禁进入开发；模块内影响正确性和安全性的未知项仍须补齐。通过路由、数据、操作、RBAC 和缓存场景的部署后验证，并附可回读的制品 tag/digest、Pod imageID 和可复现证据后，才能标记为“已验收”。

## 2026-10-22 开发任务与最终子路径结果

以下任务确认后已顺序实现、提交和部署：`b08d3421e` 修正操作失败反馈，`b329aae26` 修正项目权限及行 cluster，`7961eaedc` 修正状态原因和成功刷新。最终 CI Run `39711771206` 成功，131 镜像 `feature-v4-configmaps-secrets-20261022-103154-7961eaedce66`，Pod imageID digest `sha256:cd358cb4d3f422d04091133dd7cd6d83e0cf1a290d842b41e7e67ed6780087fa`。仓库 72 个文件、246 项及包构建通过；浏览器 24 项通过，真实停止/删除和实时更新已由 API/UI 核对。Console 全量类型检查仍失败；创建、完整权限、动作等价和作用域隔离仍待补齐，不能晋级为模块已验收。详见[操作验收记录](./workload-actions-131-verify-20261022.md)。

代码基线 `412358f5f0424801688c99ea4340fb83dda197b5`：三个项目列表已经原生化，但创建按钮仍为空回调，不能视为完整交付。首先关闭操作失败误报成功的问题，再顺序补齐原生创建和其余动作差异。

- 已定位：共享 `workloadStore` 的单个删除、批量删除、批量停止和直接 `batchDelete` 返回 `Promise.allSettled`，即使 API 拒绝，React Query 仍进入成功状态，触发成功提示并关闭确认框。
- 最小修复：保留等待全部请求完成的行为；任何请求失败后抛出原始错误，使成功回调只在所有请求成功时运行。保留成功返回结构、DeleteOptions 和已有 HPA 清理路径。
- 回归边界：覆盖三类 Workload、403/500/网络失败、成功回调、HPA 清理失败、部分成功、等待剩余请求完成及空批次。不据此宣称已补齐批量删除的 HPA 功能差异或完整 RBAC。
- 本地结果：新增行为回归 17/17 通过；修改前 13 个用例因未拒绝错误而失败。仓库回归 71 个文件、234 个测试通过；ESLint、Prettier、shared TypeScript 检查和 `build:packages` 通过。131 浏览器结果另附实际执行记录。
- 初始缺口中的项目 Action 权限参数、行 cluster 和成功刷新已补齐并取得本轮证据；创建向导、完整缓存/作用域证据、完整动作和 V3 功能等价仍未完成。三个模块仍未验收。

## 2026-10-22 Deployment 原生创建第一批

| 能力             | 当前结果                                                                              | 状态       |
| ---------------- | ------------------------------------------------------------------------------------- | ---------- |
| 原生创建入口     | 项目 Deployment 列表直接打开 V4 弹窗，不调用 V3/Wujie                                 | 第一批通过 |
| 基础信息         | namespace 固定；支持名称、别名、描述和副本数                                          | 第一批通过 |
| 容器             | 支持一个普通容器的名称、镜像和拉取策略                                                | 第一批通过 |
| 对象语义         | `apps/v1`、`app` 标签同步、默认 ServiceAccount、RollingUpdate `25%/25%`               | 第一批通过 |
| 成功/取消/重复名 | `201` 创建、取消不落对象、`409` 保留弹窗并显示中文错误                                | 部署后通过 |
| 缓存与路由       | 创建后列表实时出现，刷新保持，原生详情直达和返回通过，UI 删除后列表移除               | 部署后通过 |
| 完整 V3 创建向导 | 多/初始化容器、端口、环境变量、探针、资源、存储、镜像凭据、调度、安全和高级设置未实现 | 待开发     |
| RBAC/作用域      | 当前 namespace 固定已验证；创建权限正反矩阵、跨项目切换和网络失败仍待补齐             | 待验证     |

实现提交为 `b84eccc56`、`caf9cd6dd`、`a05a96518`。最终 CI Run `39722386439` 成功，131 Pod imageID digest 为 `sha256:842c057345bfcea3edb6af388ff8db5b3260fc98b6f813a8f7f7b7195235da24`。详见[Deployment 原生创建 131 验证记录](./deployment-create-131-verify-20261022.md)。
