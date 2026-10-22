# Workload 组合开发能力边界矩阵

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
