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
