# Workload 三类资源模块测试设计（2026-10-23）

## 目标与范围

本设计服务于 `feature/v4-workloads` 的 `Deployment`、`StatefulSet`、`DaemonSet` 组合批次。目标是验证 V4 原生实现覆盖旧 V3 已确认的功能边界，并分别证明三类资源的资源差异、请求边界、权限、缓存和页面行为。

本设计不把历史镜像、旧分支或旧浏览器结果继承为当前批次通过；它们只用于选择回归场景。当前阶段仍为 `REA`，本文件不授权业务代码修改或部署。

## 测试准入判断

本任务同时涉及关键编辑流程、资源状态变更、RBAC、Kubernetes API 契约、跨 namespace 作用域和真实部署后的浏览器行为，命中测试准入门禁。进入 DEV 前必须先完成本设计涉及的证据前置，尤其是三类资源的字段清单、更新策略差异、DaemonSet 停止语义、StatefulSet Service/卷模板和当前 V4 请求方法差异。

当前已经具备：

- 旧源码设置分区、字段组和资源特有 Action 的静态清单；
- 当前 `v3dist` 普通资源入口、Action 处理器和分区定位，以及 131 已部署制品的限定浏览器观察；
- 当前 V4 Workload Store、URL、PUT/PATCH/删除、HPA 和 StatefulSet Service 的源码定位；
- 已有组件、Store、作用域和历史浏览器回归用例；
- 131 测试环境、专用 namespace 约束和镜像部署链路记录。

当前缺少：

- 有效的 131 浏览器测试登录会话；本轮登录尝试返回凭据错误，因此没有把运行时结果写成通过；
- 低权限账号及其明确的 Role/RoleBinding 数据；
- 三类资源各自可复现的 Deployment、StatefulSet、DaemonSet fixture；
- 当前版本三类资源完整的 V3 Network/Action 采集；
- 当前分支最终镜像、Pod imageID 和部署后页面证据。

## 已有回归资产与复用方式

| 资产                                                                                    | 用途                                                                   | 处理方式                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.test.ts` | 创建对象、容器、初始化容器、端口、环境变量、探针、资源、卷、引用和校验 | 保留并扩展为三类资源的独立对象构造/解析测试；不以 Deployment 测试替代 STS/DS |
| `packages/console/src/pages/projects/components/WorkloadCreateModal/index.test.ts`      | 设置表单字段和跨容器校验依赖                                           | 继续复用，增加资源类型字段和不适用字段的断言                                 |
| `packages/shared/src/stores/workload/index.test.ts`                                     | Store 成功/403/500/网络失败、批量操作、HPA 清理、作用域和创建请求      | 继续复用请求边界测试；补 PATCH payload、DaemonSet 停止和缓存刷新断言         |
| `packages/console/src/pages/projects/containers/workloadScope.test.ts`                  | 列表页面传递 cluster/workspace/namespace 和 mutation 回调              | 扩展三类资源的 namespace 正反隔离和成功后刷新                                |
| 三类 `Detail/native.test.ts`                                                            | 页面没有 V3/Wujie 桥接、编辑入口使用原生实现                           | 在 STS/DS 入口改为原生设置后补字段和入口断言                                 |
| `ConfigReference` 现有测试                                                              | 配置引用、环境变量来源、文件挂载和重新加载                             | 作为 Workload 配置引用回归底座，按三类资源分别验证                           |
| 历史 `deployment-settings-verify-20261022.md` 与 `workload-131-verify-20261022.md`      | 已发现的缓存、并发、错误反馈和浏览器操作路径                           | 只复用场景和失败根因，不继承旧 SHA 的通过结论                                |

## 分层测试计划

### API / Service Guards

优先完成以下可自动化断言：

1. 三类资源的列表、详情、Watch、创建、PUT/PATCH、删除 URL 均带正确 cluster/namespace/name 和 API version；编辑设置需区分 Deployment 的完整资源 PUT 与其他 Action 的 PATCH。
2. 编辑设置保留 `resourceVersion`、不可编辑字段、ownerReferences、未知卷来源和未改字段；字段清空行为按 REA 记录逐项断言。
3. Deployment 使用 `maxUnavailable/maxSurge`，StatefulSet 使用 `partition/serviceName/volumeClaimTemplates`，DaemonSet 使用 `maxUnavailable/minReadySeconds`；不允许将副本伸缩或停止逻辑跨资源复用。
4. 关联 HPA 的创建、更新、删除和批量删除请求失败时，整体 mutation 失败且不报告成功。
5. StatefulSet Service 使用 Headless/Selector 的正确 payload；Service 403/404/422 传播到调用方。
6. 权限拒绝返回 403 时不改变本地成功状态；不存在资源返回 404 时显示错误或空态；网络失败不产生假成功。
7. 查询 key 和刷新逻辑包含资源类型、cluster、namespace、name；更新、删除、切换 namespace 后不能读到其他作用域缓存。

### Stable UI Regression

只保留核心操作链，使用稳定角色、文本或 `data-test` 选择器：

- 三类资源列表只显示当前 namespace；列表、详情、直达 URL、刷新、浏览器返回均能恢复正确资源；
- 三类资源分别打开原生“编辑设置”，确认分区、资源特有字段和不适用字段；不出现 V3 iframe 或 YAML 代替设置表单；
- Deployment 编辑策略和容器配置；StatefulSet Service、更新分区和卷模板；DaemonSet 调度、更新策略和停止/重启相关入口；
- 有权限账号完成一次创建/编辑/删除闭环，API 回读与页面重新打开一致；
- 低权限账号分别验证列表、详情、编辑、删除和 Service 操作的拒绝路径；
- 失败、取消、刷新和重新打开后不残留旧错误或旧 namespace 数据。

### Natural Language Draft Flows

在有效浏览器会话取得后，先以草稿流程覆盖复杂组合：多容器、初始化容器、三类探针、ConfigMap/Secret 环境引用、PVC/emptyDir/HostPath、节点选择、亲和性、污点容忍、安全上下文、元数据和 IP 池。草稿只用于发现字段遗漏和页面渲染问题，未稳定前不升级为 CI 回归。

### Manual Exploration

以下内容保留人工探索：API Server 短暂不可用、Watch 断线/重连、复杂多集群或联邦限制、极少使用的卷来源、扩展初始化影响以及需要观察视觉布局的长表单。每次人工探索必须保存不含凭据的步骤、结果、时间、代码 SHA 和制品身份。

## MVTests 与测试数据

| 编号     | 最小可验证场景                          | 通过条件                                                               |
| -------- | --------------------------------------- | ---------------------------------------------------------------------- |
| WL-MV-01 | 有权限账号在专用 namespace 创建三类资源 | API 对象、页面列表和详情均只属于目标 namespace                         |
| WL-MV-02 | 三类资源分别打开并保存设置              | 请求方法、payload、资源版本和资源特有字段符合 REA 矩阵，重新打开值一致 |
| WL-MV-03 | 三类资源分别执行可用运维 Action         | 成功、失败、取消三种路径状态和提示一致，DaemonSet 不执行错误的副本伸缩 |
| WL-MV-04 | 跨 namespace 直达/刷新/返回和切换       | 页面、列表和 API 都不泄露另一 namespace 数据                           |
| WL-MV-05 | 低权限账号访问同一组资源                | 允许读取的路径成功，禁止的编辑/删除/API 请求得到明确拒绝               |
| WL-MV-06 | 修改后刷新、Watch 和缓存回读            | 不出现旧值、跨资源串值、请求洪泛或已删除资源 404 洪泛                  |
| WL-MV-07 | StatefulSet Service 和卷模板            | Headless/Selector、serviceName、volumeClaimTemplates 的保存和回读一致  |
| WL-MV-08 | 失败和取消                              | 网络失败、403、404、409、422、取消都不报告假成功，修正后可重试         |

测试资源统一使用 `v4-migration-e2e` namespace、唯一时间后缀和 `v4-migration` 标签；清理只删除本轮创建的资源，保留 namespace。Secret 值使用随机非敏感值，日志、截图和报告不记录账号、密码、Token 或 Secret 内容。

## 进入 DEV 前置条件

以下条件全部满足后，才允许从 REA 进入 DEV：

1. 三类资源字段、默认值、清空/保留语义、Action/API/Store 和资源差异矩阵均有证据；
2. 低权限角色和 fixture 已明确，不能用 admin 结果代替；
3. 当前 V4 的 STS/DS 编辑设置入口已完成设计并有对应测试用例；
4. DaemonSet 停止/重启与 Deployment/StatefulSet 的差异已有明确实现方案；
5. 负责人完成 REA 复核并在 `module-execution.json` 中登记，不由本测试设计自动放行；
6. 新增代码前先补可复用的 API/Store 或组件测试，再实现功能。

## 开放风险

- 131 已取得 admin 浏览器登录会话并完成限定页面观察，但当前部署镜像不是本分支当前 SHA，不能开始正式 VERIFY；
- `origin/release-3.4` 不是当前制品源码证明，只能作为字段和历史行为参考；
- 当前 V4 Deployment 编辑设置使用原始资源 GET 后 PUT，StatefulSet/DaemonSet 当前入口仍为 YAML；旧 V3 也使用 GET resourceVersion 后 PUT，三类资源的等价性必须用真实请求和并发场景分别验证；其他运维 Action 仍可能使用 PATCH。
- 当前 Store 没有统一 mutation 后缓存失效机制，依赖页面显式 `refetch()` 的路径必须逐项验证；
- 旧源码 DaemonSet 停止逻辑与当前固定 `spec.replicas=0` 存在高风险差异；
- PR #2 的完整历史差异在 REA 阶段仍会被门禁检查拒绝，不能把工具回归成功当成 PR 必检通过。
