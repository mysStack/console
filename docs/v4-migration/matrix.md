# V4 迁移矩阵

> 事实检查日期：2026-10-17；文档复核日期：2026-10-17
> 迁移集成分支：`feature/v4-migration`  
> 基线：`release-4.1.5` / `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`

状态值为：`未开始`、`分析中`、`开发中`、`测试中`、`阻塞`、`已验收`。`阻塞`表示缺少外部输入或环境条件，不能通过继续编码绕过。只有附带部署后制品的 Playwright 证据，模块才能标记为 `已验收`。

> 执行策略（2026-10-17 调整）：全局 P0-U001～P0-U004 风险持续跟踪，不再作为所有模块的统一开发阻塞。每个模块独立执行 `模块-REA → 模块-DEV → 模块-VERIFY → 模块-PR`；模块内影响功能正确性或安全性的高风险未知项仍然阻塞该模块。ConfigMap、Secret、ServiceAccount 之前已经发生的实现和测试作为先行证据保留，不自动等同于模块 REA 或 VERIFY 已通过。

本轮 REA 结果和限制统一记录在[REA 阶段分析总结](./rea-analysis-summary.md)，该文档的阶段门禁结论优先于单次测试或部署记录。

本轮模块 DEV 已在 `feature/v4-configmaps-secrets` 本地提交 `ec21875c1`、`5c0162517`：完成 ServiceAccount Secret 引用脱敏，并使 `corepack yarn build:packages` 在 Node `v22.22.1` 下通过；55 个测试文件、220 个测试通过。该证据不替代部署后制品的 rollout、Playwright、权限正反路径、namespace 隔离和 Secret 运行时关联验证。

矩阵的“状态”描述模块执行进度，阶段门禁状态以 REA 总结中的 `未开始`、`分析中`、`待复核`、`已通过`、`不通过`、`阻塞`为准；模块出现“分析中”不表示对应阶段 REA 已通过。

## 模块级门禁

| 模块           | 当前门禁                | 本轮允许动作                   | 必须补齐的证据                                                                | 当前结论                                                                                                                       |
| -------------- | ----------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ConfigMap      | VERIFY 部分通过，待补齐 | 继续处理完整错误态和功能等价性 | 旧行为对照、API/Action、配置历史、跨项目隔离、部署后 Playwright               | 项目级 namespace 正反展示、刷新、返回、NotFound、数据编辑、有效 YAML、配置引用和低权限 RBAC 已验证；仍不能标记为已验收         |
| Secret         | VERIFY 部分通过，待补齐 | 继续处理完整错误态和功能等价性 | 数据不泄露、编辑回显、配置引用、RBAC、跨项目隔离、部署后 Playwright           | 项目级 namespace 正反展示、刷新、返回、NotFound、脱敏、编辑设置、YAML 持久化、配置引用和低权限 RBAC 已验证；仍不能标记为已验收 |
| ServiceAccount | VERIFY 部分通过，待补齐 | 继续处理完整错误态和功能等价性 | Secret 关联、列表/详情/API、角色修改、RBAC、namespace 隔离、部署后 Playwright | 项目级 namespace 正反展示、刷新、返回、NotFound、低权限读写边界、角色提交和允许编辑字段已验证；仍不能标记为已验收              |

模块级门禁通过不改变全局 P0 状态，也不授权删除 V3/Wujie、创建最终发布分支或宣布全量迁移完成。

## 2026-10-17 最新部署后浏览器证据

当前 131 实际运行的是代码提交 `05450c14f733a1c2e189270f2b257759dadacd8b` 对应的镜像：
`feature-v4-configmaps-secrets-20261017-215959-05450c14f733`，digest 为
`sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`。
Deployment `kubesphere-system/ks-console` generation/observedGeneration 为 `511/511`，Pod
`ks-console-56cbbb9df8-ptp5r` 为 Running/Ready，Pod imageID 与 digest 一致。

本轮通过真实 Playwright 登录并验收了三个项目级页面：

| 模块           | 本轮新增部署后证据                                                                     | 清理结果                                             | 当前状态                |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| ConfigMap      | 当前 namespace 列表、创建、详情、元数据编辑、数据编辑、历史、元数据、事件、删除、刷新  | 本轮 ConfigMap 及其配置历史对象已清理                | VERIFY 部分通过，待补齐 |
| Secret         | 当前 namespace 列表、创建、详情默认掩码、元数据编辑、历史、元数据、事件、删除、刷新    | 本轮 Secret 及其配置历史对象已清理，测试值未写入证据 | VERIFY 部分通过，待补齐 |
| ServiceAccount | 当前 namespace 列表、角色选项缓存切换、专用账号创建、`viewer` 角色提交、列表刷新、删除 | 本轮 ServiceAccount 已清理，既有 `default` 保留      | VERIFY 部分通过，待补齐 |

跨项目核验还实际打开了 `test-wes` 的 ServiceAccount 角色弹窗：请求 namespace 随路由切换，前一项目的角色选项没有串入当前项目；切回 `v4-migration-e2e` 后角色选项恢复。该证据支持角色查询键的 namespace 作用域修复，但不替代低权限 RBAC 和全量权限矩阵。

本轮仍未关闭：ConfigMap YAML 持久化、ConfigMap/Secret 配置引用工作负载、低权限正反路径、完整跨 namespace 正反隔离、ServiceAccount 可编辑字段，以及全局/扩展运行时错误。三个模块不能标记为“已验收”，全局 P0 继续保持“分析中，待负责人复核”。

本次全量文档复核见[文档与流程复核记录](./document-review-2026-10-17.md)。

本轮 P0 针对性风险关闭结果见[P0-U002/U003 风险关闭矩阵](./p0-risk-closure-matrix.md)。该矩阵逐项记录 cluster、workspace、project、federated、platform、extension 的路由、V3/Wujie 入口、静态 RBAC、API/Store、131 证据和 V4 替代边界，并单列 11 个业务 `useV3action` 调用和 3 个桥接文件。静态权限路径和代表性运行时证据均不能替代全量 API RBAC、低权限和错误态验证。

| 模块                             | V3 路由/入口                                                                                 | V3 操作                                                  | V4 对应代码                                                                                                                                        | 缺口                                                                                                                                                                 | 证据                                                                                                                                                                                                                | 负责人/执行器 | 状态   | 测试链接                              | PR  |
| -------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ | ------------------------------------- | --- |
| ConfigMap                        | `/:workspace/clusters/:cluster/projects/:namespace/configmaps`，原为 `ConsoleV3ResourceList` | 列表、创建、编辑、删除；详情历史/元数据/事件             | 项目列表已切换 `ListPage`/`configMapStore`；原生创建弹窗；`containers/ConfigMaps/Detail`、`components/ConfigHistory`、`components/ConfigReference` | 131 已验证原生列表、创建、详情、元数据编辑、数据编辑、有效 YAML 持久化、配置引用、低权限 RBAC、批量删除和单项删除；完整跨项目正反隔离仍待补                          | [当前 VERIFY 记录](./config-secrets-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、[PR #1](https://github.com/mysStack/console/pull/1)                                                             | Codex         | 测试中 | `ConfigMaps/**/*.test.*`              | #1  |
| Secret                           | `.../secrets`，原为 `ConsoleV3ResourceList`                                                  | 列表、创建、编辑、删除；数据脱敏；历史/元数据/事件       | 项目列表已切换 `ListPage`/`secretStore`；原生创建弹窗；`containers/Secrets/Detail`、`components/ConfigHistory`、`components/ConfigReference`       | 初次 Base64 回显和 YAML 编辑器回显已在 131 修复并复验；编辑设置、YAML 持久化、配置引用、前缀写入和低权限读写边界已有证据；完整隔离、全量错误态和全部功能等价仍待补齐 | [当前 VERIFY 记录](./config-secrets-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、[PR #1](https://github.com/mysStack/console/pull/1)                                                             | Codex         | 测试中 | `Secrets/**/*.test.*`                 | #1  |
| ServiceAccount                   | `.../serviceaccounts`，原项目列表和集群列表使用 V3 Embed                                     | 列表、创建、删除、详情、项目角色                         | 集群配置 `ServiceAccounts/` 原生 `ListPage`、创建弹窗和角色修改；项目列表/详情复用原生实现；ServiceAccount 数据详情复用现有原生组件                | 131 已验证项目/集群列表、创建、详情、删除、路由、当前 Token Secret 行为、低权限读写边界、角色提交和允许编辑字段；完整 namespace 隔离仍待补                           | [当前 VERIFY 记录](./service-account-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、`packages/shared/src/stores/serviceAccounts.test.ts`、[草稿 PR #1](https://github.com/mysStack/console/pull/1) | Codex         | 测试中 | `ServiceAccounts/**/*.test.*`         | #1  |
| Deployment                       | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、伸缩、回滚、重启、删除、配置引用、事件、监控 | 集群列表/详情和 `stores/workload`；项目详情仍有 V3 桥接                                                                                            | 项目列表/详情仍是 V3；V3 配置弹窗仍存在；集群路由范围需完整浏览器对照                                                                                                | [Deployment 证据](./deployment-v3-evidence.md)、[缺口矩阵](./deployment-gap-matrix.md)                                                                                                                              | Codex         | 分析中 | 现有工作负载/Store 测试；131 E2E 待补 |     |
| StatefulSet                      | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、伸缩、重启、删除、配置引用                   | 集群工作负载实现和项目详情外壳                                                                                                                     | 项目列表/详情和操作弹窗仍有 V3；等价性待验证                                                                                                                         | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| DaemonSet                        | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、重启、删除、配置引用                         | 集群工作负载实现和项目详情外壳                                                                                                                     | 项目列表/详情和操作弹窗仍有 V3；等价性待验证                                                                                                                         | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Pod                              | 项目列表/详情使用 V3 桥接                                                                    | 状态、日志、终端、删除和容器导航                         | `containers/Pods/` 及集群工作负载源码                                                                                                              | V3 列表/详情、终端和日志生命周期需要原生等价实现                                                                                                                     | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Service / Ingress                | 项目和集群路由含 V3 Embed                                                                    | 创建/编辑/删除、端点、端口和路由                         | `containers/Services/`、`containers/Routes/`                                                                                                       | 项目和集群 Embed 仍在；API 和操作等价性待验证                                                                                                                        | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Job / CronJob                    | 项目和集群路由含 V3 Embed                                                                    | 触发/重跑、暂停、历史、删除                              | `containers/Jobs/`、`containers/CronJobs/`                                                                                                         | V3 列表、集群 Embed 和执行流程需要等价验证                                                                                                                           | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 存储 / 快照                      | 项目和集群路由含 V3 Embed                                                                    | PVC/PV、快照和快照内容操作                               | `containers/Volumes/`、`containers/VolumeSnapshots/`                                                                                               | 多个集群和项目 Embed 仍在                                                                                                                                            | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 网络 / 告警 / 监控               | 集群和项目范围存在 V3 Embed 和 V3 Action                                                     | 策略、告警、自定义监控                                   | `containers/Network/`、`containers/Alerting/`、监控页面                                                                                            | 范围、操作和可视化等价性待验证                                                                                                                                       | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 联邦                             | 联邦项目页面主要使用 Wujie Embed                                                             | 跨集群资源查看和操作                                     | `pages/fedprojects/`                                                                                                                               | 尚未映射原生替代方案；RBAC 和数据隔离需单独计划                                                                                                                      | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 扩展 / 平台 / DevOps / Telemetry | 公共扩展 Embed，以及平台和模块 Embed                                                         | 扩展路由、平台配置、DevOps 和 Telemetry 流程             | 现有扩展和平台源码                                                                                                                                 | 当前启用扩展清单及 V4 契约未完成                                                                                                                                     | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |

## 全局 P0 风险持续跟踪

- [x] 从 `release-4.1.5` 的 `fc1253cbe` 创建 `feature/v4-migration`。
- [x] 完成 V3/Wujie 静态依赖清单。
- [x] 创建 Deployment 路由、API、Store、操作和缺口文档。
- [x] 完成 `v3dist` 第一轮 REA 制品分析，并在 [REA 阶段分析总结](./rea-analysis-summary.md) 记录证据和限制；该结果为部分覆盖，不代表 P0-REA 通过。
- [x] 在独立 Worktree 形成 [P0-Audit](./p0-audit-evidence.md)、[V3 路由入口库存](./p0-route-inventory.md)、[P0-REA](./p0-rea-evidence.md) 和 [P0-Baseline](./p0-baseline-evidence.md) 首轮证据，并由单 Codex 会话顺序补充 Action 映射、重点 Chunk REA 和源码 provenance；证据已汇入协调分支，等待统一门禁复核。
- [ ] 根据 131 部署版本继续映射所有启用路由和扩展；已完成代表性项目菜单、Wujie frame、直达/刷新/返回、原生详情 Tab、Network 和扩展状态取证，详见 [P0 131 运行时与制品身份证据](./p0-runtime-evidence.md)。该项继续作为全局风险跟踪，不统一阻塞已完成模块级 REA 的开发。
- [ ] 固定旧 V3 源码来源、tag/commit 与当前 `v3dist` 构建 provenance，并完成 P0-REA 门禁复核；候选源码版本、commit 和许可证已固定，但当前制品对应关系仍未关闭。

本轮顺序取证提交：P0-Baseline `be20bc7a3`、P0-Audit `5fc90ebf5`、P0-REA `8c6f59e69`。本轮针对性运行时收尾见 [`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)。这些提交和本轮文档只补充证据，没有修改功能代码、`release-4.1.5` 或部署环境；独立人工/其他复核、联邦 fixture、低权限验证和 131 全量运行时映射仍未完成，因此全局 P0 保持“分析中，待负责人复核”。该结论不阻塞已经完成模块级 REA 的 ConfigMap、Secret、ServiceAccount 收尾工作。

### 2026-10-18 Secret YAML 脱敏阻塞收尾

Secret YAML 编辑器曾在实际浏览器中暴露已有 `data` 和 `last-applied-configuration` 内容。该缺陷已由 `cc36e3535`、`cc8e9fc7e` 修复，并在最终制品 `feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b`、manifest digest `sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce` 上完成 131 rollout 和真实浏览器复验。编辑器不显示原值，明确修改和新增键可持久化，刷新后继续掩码；专用资源已清理。该缺陷标记为已验证修复，Secret 模块仍保持“VERIFY 部分通过，待补齐”，全局 P0 状态不变。

## 历史先行证据（不计入阶段门禁）

- [x] ConfigMap/Secret 项目列表、详情、创建、编辑、删除和批量操作已通过原生浏览器先行验收；该证据不替代 P2-REA 门禁。
- [x] ServiceAccount 项目/集群列表、详情、创建、编辑、删除、角色修改和最小 RBAC 场景已通过先行验收；该证据不替代 P2-REA 门禁。
- [ ] 每一行都有对应 REA 证据、负责人、测试证据和正式 PR 后，才能标记为 `已验收`。

## 重新评估记录（2026-10-16）

本次按 `console-v4-migration-plan.md` 逐项核对后的结论如下：

| 计划项                                 | 当前结论                | 依据和未完成项                                                                                                                                                                                                                         |
| -------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布基线                               | 已完成                  | `v4.1.5` 与 `release-4.1.5` 均指向 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`；`feature/config-history` 末提交 `2656419bc` 已在基线历史中，分支引用已删除。                                                                            |
| 迁移集成分支                           | 已完成                  | `feature/v4-migration` 已在本地和 `origin` 存在；文档提交以该分支当前 HEAD 和 Git 历史为准。                                                                                                                                           |
| 模块短期分支 / PR                      | 部分完成                | `feature/v4-configmaps-secrets` 已创建并推送，草稿 PR [#1](https://github.com/mysStack/console/pull/1) 已指向 `feature/v4-migration`；`feature/v4-resource-framework`、`feature/v4-workloads`、`feature/v4-storage-network` 尚未创建。 |
| P0 静态盘点                            | 部分完成                | 依赖清单、Deployment 证据和缺口矩阵已生成；WSL REA 验证、旧 V3 源码基线、131 全启用路由/扩展映射、V3 Action 完整实测和每行 PR 证据仍未完成。                                                                                           |
| P1 公共底座                            | 未形成完成证据          | 复用了现有 `ListPage`、`DataTable` 和 Store，但 cluster/workspace/project 作用域、缓存隔离、权限和返回恢复的统一验收尚未完成。                                                                                                         |
| P2 ConfigMap / Secret                  | VERIFY 部分通过，待补齐 | 已有先行实现和 131 列表、详情、创建、编辑、删除、批量删除、有效 YAML 持久化、配置引用及低权限 RBAC 证据；完整跨 namespace 正反路径和完整功能等价性未完成，尚未通过 P2-REA。                                                            |
| P2 ServiceAccount                      | VERIFY 部分通过，待补齐 | 已有先行实现和 131 列表、详情、创建、编辑、删除、角色修改及低权限读写证据；完整 REA/API/Action/权限/作用域矩阵和功能等价性未完成，尚未通过 P2-REA。                                                                                    |
| M1 Deployment                          | 未完成                  | 证据文档已生成，但 V3 Action、131 Network、RBAC、缓存隔离和完整操作矩阵仍未验证。                                                                                                                                                      |
| M2 ConfigMap + Secret + ServiceAccount | 未完成                  | 真实操作、有效 YAML 持久化、配置引用、低权限 RBAC、ServiceAccount 角色提交和允许编辑字段已有部署后证据，但完整权限矩阵、跨项目正反隔离及正式 P2-VERIFY 尚未完成，不能标记为 `已验收`。                                                 |
| P3-P8 / release-4.2.0                  | 未开始                  | 后续资源迁移、V3/Wujie 清理和 `release-4.2.0` 创建均未达到前置条件。                                                                                                                                                                   |

本次策略已调整为：全局 P0 风险持续跟踪；ConfigMap、Secret、ServiceAccount 分别完成模块级 REA 后，按模块进入 DEV、VERIFY、PR。已有实现和 131 记录作为先行证据继续复核，不自动标记模块已验收。Deployment 文档继续作为逆向输入，正式开发前必须完成 Deployment 自身模块级 REA。

## 2026-10-17 当前制品浏览器验收补充

当前分支 `feature/v4-configmaps-secrets` 的最新代码提交为 `259b556eccd19fbbbade8392db4954f195672114`。通过 GitHub Actions Run `39027793096` 构建的镜像为 `feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`，digest 为 `sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`，131 Pod `ks-console-69fc77bb7b-gbb2j` 的 imageID 与该 digest 一致，rollout 已成功。

负责人要求以真实浏览器登录和页面渲染为准。本轮新建 Playwright 会话从 `/login` 登录成功进入 `/dashboard`，并在已部署制品上实际检查 ConfigMap、Secret、ServiceAccount 三个原生列表页面：页面标题、侧边导航、工具栏、表格和数据行均正常显示。Secret 列表发现的名称列窄导致长名称逐字换行问题已在 `259b556eccd1` 修复，并通过截图复验；本地截图未提交 Git。

浏览器控制台仍有 `common is not defined`、`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 等全局/扩展错误。它们没有阻止三个目标列表页面显示，但仍未关闭。三个模块的编辑、配置引用、低权限 RBAC、完整 namespace 隔离和全部功能等价性仍未完成，因此模块状态继续为“VERIFY 部分通过，待补齐”，全局 P0 继续为“分析中，待负责人复核”。

## 2026-10-17 项目 namespace 作用域修复与部署结果

针对项目级 ConfigMap、Secret、ServiceAccount 页面显示“全部项目”的问题，提交 `00310f5e5a3105f177e9e8d413db359f26bbd1d1` 已完成最小代码修复：项目路由隐藏跨项目选择器，ConfigMap/Secret 请求改为当前 namespace 资源 URL，创建弹窗锁定路由 namespace。修复前项目路由中的 `:namespace` 没有传入通用 `ListPage`，ConfigMap/Secret 因而存在加载全量 namespace 数据的实际风险；ServiceAccount 存在请求范围与界面提示不一致的问题。

本地定向测试和完整测试已通过，GitHub Actions Run `39031017563` 的单元测试及镜像构建也已通过。候选镜像为 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`，digest 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`。

131 部署未完成：generation/observedGeneration 为 `508/508`，新 Pod `ks-console-699dd9c46f-ldvtc` 被调度但超过 300 秒仍为 `ContainerCreating`，只有 `Pulling image` 事件，没有 Ready 或 imageID。已按授权回滚，当前恢复上一版镜像 `feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`，其运行中 Pod imageID 为 `sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`。候选制品尚未完成 rollout，因此尚未进行该修复的浏览器登录、页面渲染和数据范围验证；三个模块状态不变，仍为“VERIFY 部分通过，待补齐”。

随后按同一授权范围重新部署候选制品，第二次镜像拉取耗时约 `1m23.914s` 后成功。Deployment generation/observedGeneration 为 `510/510`，Pod `ks-console-699dd9c46f-jstfd` Running/Ready，imageID 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`，rollout 成功。

在已登录的真实 Playwright 会话中复验项目页面：ConfigMap 1 行、Secret 2 行、ServiceAccount 1 行，所有可见项目列均为 `v4-migration-e2e`；三个页面均不再出现“全部项目”选择器。Secret 直达、刷新和浏览器返回后仍保持当前项目路由、选择器隐藏和数据行稳定。截图保存在 `.playwright-cli/page-2026-10-17T12-25-30-293Z.png`、`.playwright-cli/page-2026-10-17T12-25-35-674Z.png` 和 `.playwright-cli/page-2026-10-17T12-25-41-225Z.png`，未提交 Git。

该项 namespace 作用域修复已取得部署后浏览器证据；三个模块仍不能标记为“已验收”，因为编辑、配置引用、低权限 RBAC、完整隔离和全部功能等价性尚未完成。浏览器控制台仍有已知全局/扩展错误，继续单独跟踪。

## 2026-10-17 namespace 漏测复盘

本次问题同时暴露了实现测试和环境验收两处缺口：

- 原有项目 ConfigMap/Secret/ServiceAccount 测试主要是源码级断言，只确认原生 `ListPage`、Store 和 V3 依赖边界，没有运行组件验证 `:namespace` 是否传入资源 URL，也没有断言项目页面不显示“全部项目”。本次修复后的源码断言是在发现问题后补上的，不能证明修复前已经有覆盖。
- 之前浏览器验收确认了登录、标题、工具栏、表格和数据行能显示，但没有把“当前路由 namespace、可见资源的项目列、选择器隐藏、刷新和浏览器返回”作为强制验收条件，因此页面可渲染被错误地当成作用域正确。
- 后续项目级资源页面的 VERIFY 必须同时检查：直接访问、刷新、浏览器返回；页面不存在“全部项目”；所有可见资源的项目列等于路由 namespace；ConfigMap/Secret 请求使用 namespaced URL；创建弹窗锁定当前 namespace。集群级页面则必须明确保留全局选择器。

登录测试环境还存在独立问题：`/home/bruce/.bashrc` 的非交互 shell 提前返回，普通 `source` 不会加载测试变量；改用交互 shell 后当前测试账号登录被拒绝。该问题属于测试账号/环境阻塞，不能把未成功登录写成浏览器登录通过。

## 2026-10-17 主流程收尾复核

当前分支最新文档提交为 `e1632f8a0`。本轮未修改业务代码，也未在 131 执行新的状态变更。针对 ConfigMap、Secret 和配置引用相关实现，逐个执行 19 个测试文件，共 119 个用例全部通过；`git diff --check` 和提交钩子的 Prettier 检查通过。

131 当前仍运行 namespace 作用域修复制品：Deployment generation/observedGeneration 为 `510/510`，Pod `ks-console-699dd9c46f-jstfd` 为 Running/Ready，镜像 tag 为 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`，Pod imageID 对应 digest 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`。此前已在该制品上完成项目 ConfigMap、Secret、ServiceAccount 的 namespace 列表渲染、Secret 刷新和浏览器返回证据。

当前不能继续执行新的浏览器登录和状态变更验证：现有会话已过期，独立测试账号被测试环境拒绝。该环境阻塞需要账号轮换或恢复后再补登录闭环；在此之前不继续尝试凭据，也不把本地测试或旧会话证据扩大解释为新的登录通过。ConfigMap/Secret 数据编辑、YAML 持久化、配置引用工作负载、ServiceAccount 角色提交、低权限 RBAC 和完整跨 namespace 正反路径仍未关闭，三个模块维持“VERIFY 部分通过，待补齐”。

随后发现并修复 ServiceAccount 角色选项的缓存作用域缺口：角色弹窗原来使用固定 React Query 键 `['roles']`，虽然请求包含 cluster/namespace，跨作用域时仍可能复用缓存。当前改为按 cluster 和 namespace 组成查询键，并新增回归断言。`./scripts/test.sh` 已通过 57 个文件、226 个用例，`corepack yarn build:packages` 也已通过；该提交尚未部署到 131，不能标记角色缓存修复已完成浏览器验收。

## 2026-10-18 namespace 隔离和错误反馈补充

在最终部署制品上，ConfigMap、Secret、ServiceAccount 分别完成项目级列表、详情、刷新、浏览器返回和跨项目对象排除验证。三个模块直达不存在对象的详情 URL 均显示 Kubernetes `NotFound ... not found`。本轮关闭项目级 namespace 展示/排除、刷新返回和 NotFound 证据；完整 RBAC 组合、全部 V3 功能等价性和全部错误态组合仍未关闭，扩展运行时错误按负责人指令延期。

### 2026-10-18 网络失败错误反馈

资源列表 API 在没有 HTTP response 的网络失败场景下，已补充 `Network Error` 全局提示并完成 `8c6262d97` 的本地测试、CI、131 部署和 Playwright 拦截验证。该项关闭“无 response 导致前端异常且没有错误提示”的缺口；真实 API Server 故障未执行，扩展初始化错误继续延期。

同一最终制品上，ConfigMap、Secret 的原生批量删除也已通过真实浏览器和 Kubernetes API 复核；两个临时对象均按确认流程删除并返回列表。批量操作的低权限拒绝和全部 V3 行为等价性仍未关闭。

角色缓存修复随后已构建并部署到 131：代码提交 `05450c14f733a1c2e189270f2b257759dadacd8b`，GitHub Actions Run `39038790572`，镜像 tag `feature-v4-configmaps-secrets-20261017-215959-05450c14f733`，digest `sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`。Deployment generation/observedGeneration 为 `511/511`，Pod `ks-console-56cbbb9df8-ptp5r` 为 Running/Ready，imageID 与 digest 一致。浏览器直达项目 ServiceAccount 页面已执行，但已有会话已过期并重定向 `/login`；新制品的登录、角色弹窗、角色提交和页面渲染仍未验证。

## 2026-10-17 Secret 编辑设置脱敏修复

Secret 编辑设置曾在表单初始化时解码并回填已有数据，造成浏览器中出现明文。提交 `ba5a4518d`、`d6b4135fc` 已修复数据列表和编辑表单的处理：已有值保持掩码/空值，新值才编码提交，ConfigMap 明文编辑行为不变。

本轮单元测试 `./scripts/test.sh packages/console/src/pages/clusters/components/DataList/dataListUtils.test.ts` 通过（58 个文件、230 个测试）；GitHub Actions Run `39046026262` 的 Unit tests 和 Build and publish 均成功。131 使用镜像 `feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`，digest `sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e`，Deployment generation/observedGeneration `512/512`，Pod `ks-console-7766585f4-7lz6x` Running/Ready，imageID 与 digest 一致。

真实登录浏览器在 `v4-migration-e2e` 创建专用 Secret 后，详情页显示 `******`；打开“编辑设置”时已有键为空值状态，未回显原 Secret 值。随后通过原生页面删除，API 复核对象和本轮历史对象均为 NotFound。该项标记为“已验证修复”，Secret 模块总体仍为“VERIFY 部分通过，待补齐”，YAML、配置引用、低权限 RBAC、完整 namespace 正反隔离和全部功能等价性未完成。

## 2026-10-17 ConfigMap 数据编辑补充验证

在同一已部署制品和已登录浏览器会话中，ConfigMap 专用对象 `v4-cm-yaml-20261017-1457` 通过“编辑设置”新增数据键后，详情页、Kubernetes API 和刷新后的详情页均显示一致；“修改记录”显示 `#1`。对象随后经原生详情页删除，API 返回 NotFound，生成的配置历史 Secret 已清理。

“编辑 YAML”入口可以打开并显示对象内容，但本轮一次自动化输入因编辑器自动缩进与输入缩进叠加，向 API 提交了 HTTP 400；对象没有被错误更新。由于没有形成有效 YAML 粘贴和成功提交的独立证据，矩阵只将 ConfigMap 的数据编辑标记为“已验证”，YAML 持久化继续标记为“未验证”，不能据此扩大为模块验收通过。配置引用、低权限 RBAC、跨 namespace 正反隔离和完整功能等价性仍未关闭。

## 2026-10-18 完整 RBAC 组合矩阵

本轮在当前 131 制品上使用真实 Playwright 登录，建立 `viewer`、`operator`、`admin`、仅企业空间、仅项目和集群只读六种临时账号组合，逐项验证项目 ConfigMap、Secret、ServiceAccount 的 GET/POST/PUT/PATCH/DELETE，以及项目和集群路由。完整状态码、账号绑定、截图和清理结果见[完整 RBAC 组合验证记录](./rbac-matrix-131-verify-20261018.md)。

本轮结果：项目 viewer 和仅企业空间组合为项目读 `200`、项目写 `403`；operator/admin 的项目创建、更新、删除和 ServiceAccount 角色 PATCH 均通过；仅项目账号的 Console 项目入口为 `/errors/403`；集群 viewer 的集群级三个资源列表 GET 为 `200`，项目写入仍为 `403`。临时业务资源已清理，三个模块保持“VERIFY 部分通过，待补齐”。

## 2026-10-18 V3 功能逐项等价性核对结果

ConfigMap、Secret、ServiceAccount 的基础 CRUD、元数据、YAML、脱敏、ServiceAccount 角色和通用删除已按 V3 Action 逐项对照，并把旧源码位置、V4 替代入口和 131 证据写入[V3 等价性核对记录](./v3-equivalence-config-secrets-131-20261018.md)。其中旧 `secret.default` 的默认 Secret 语义在当前 V4 中未找到对应入口或 Store 实现，联邦 ConfigMap/Secret 仍使用 `consolev3` Embed；这两项不能标记为等价，三个模块保持“VERIFY 部分通过，待补齐”。
