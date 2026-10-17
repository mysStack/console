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

| 模块           | 当前门禁                | 本轮允许动作                              | 必须补齐的证据                                                                | 当前结论                                               |
| -------------- | ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| ConfigMap      | VERIFY 部分通过，待补齐 | 继续处理数据编辑、配置引用和低权限 RBAC   | 旧行为对照、API/Action、配置历史、跨项目隔离、部署后 Playwright               | 已完成部署后部分验证；不能标记为已验收                 |
| Secret         | VERIFY 部分通过，待补齐 | 继续编辑、YAML、引用和 RBAC 验证          | 数据不泄露、编辑回显、配置引用、RBAC、跨项目隔离、部署后 Playwright           | 默认脱敏已在修复制品和刷新路径复验通过；其余证据未完成 |
| ServiceAccount | VERIFY 部分通过，待补齐 | 继续处理角色提交、可编辑字段和低权限 RBAC | Secret 关联、列表/详情/API、角色修改、RBAC、namespace 隔离、部署后 Playwright | 已完成部署后部分验证；不能标记为已验收                 |

模块级门禁通过不改变全局 P0 状态，也不授权删除 V3/Wujie、创建最终发布分支或宣布全量迁移完成。

本次全量文档复核见[文档与流程复核记录](./document-review-2026-10-17.md)。

本轮 P0 针对性风险关闭结果见[P0-U002/U003 风险关闭矩阵](./p0-risk-closure-matrix.md)。该矩阵逐项记录 cluster、workspace、project、federated、platform、extension 的路由、V3/Wujie 入口、静态 RBAC、API/Store、131 证据和 V4 替代边界，并单列 11 个业务 `useV3action` 调用和 3 个桥接文件。静态权限路径和代表性运行时证据均不能替代全量 API RBAC、低权限和错误态验证。

| 模块                             | V3 路由/入口                                                                                 | V3 操作                                                  | V4 对应代码                                                                                                                                        | 缺口                                                                                                                                   | 证据                                                                                                                                                                                                                | 负责人/执行器 | 状态   | 测试链接                              | PR  |
| -------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ | ------------------------------------- | --- |
| ConfigMap                        | `/:workspace/clusters/:cluster/projects/:namespace/configmaps`，原为 `ConsoleV3ResourceList` | 列表、创建、编辑、删除；详情历史/元数据/事件             | 项目列表已切换 `ListPage`/`configMapStore`；原生创建弹窗；`containers/ConfigMaps/Detail`、`components/ConfigHistory`、`components/ConfigReference` | 131 已验证原生列表、创建、详情、元数据编辑、批量删除和单项删除；数据编辑提交、配置引用、低权限 RBAC 和完整跨项目正反隔离仍待补         | [当前 VERIFY 记录](./config-secrets-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、[PR #1](https://github.com/mysStack/console/pull/1)                                                             | Codex         | 测试中 | `ConfigMaps/**/*.test.*`              | #1  |
| Secret                           | `.../secrets`，原为 `ConsoleV3ResourceList`                                                  | 列表、创建、编辑、删除；数据脱敏；历史/元数据/事件       | 项目列表已切换 `ListPage`/`secretStore`；原生创建弹窗；`containers/Secrets/Detail`、`components/ConfigHistory`、`components/ConfigReference`       | 初次 Base64 回显已由 `8275096ab` 修复并在 131 直达/刷新路径复验；编辑、YAML、引用、低权限 RBAC 和完整隔离仍待补齐                      | [当前 VERIFY 记录](./config-secrets-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、[PR #1](https://github.com/mysStack/console/pull/1)                                                             | Codex         | 测试中 | `Secrets/**/*.test.*`                 | #1  |
| ServiceAccount                   | `.../serviceaccounts`，原项目列表和集群列表使用 V3 Embed                                     | 列表、创建、删除、详情、项目角色                         | 集群配置 `ServiceAccounts/` 原生 `ListPage`、创建弹窗和角色修改；项目列表/详情复用原生实现；ServiceAccount 数据详情复用现有原生组件                | 131 已验证项目/集群列表、创建、详情、删除、路由和当前 Token Secret 行为；角色提交、可编辑字段、低权限 RBAC 和完整 namespace 隔离仍待补 | [当前 VERIFY 记录](./service-account-131-verify-20261017.md)、[依赖清单](./dependency-inventory.md)、`packages/shared/src/stores/serviceAccounts.test.ts`、[草稿 PR #1](https://github.com/mysStack/console/pull/1) | Codex         | 测试中 | `ServiceAccounts/**/*.test.*`         | #1  |
| Deployment                       | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、伸缩、回滚、重启、删除、配置引用、事件、监控 | 集群列表/详情和 `stores/workload`；项目详情仍有 V3 桥接                                                                                            | 项目列表/详情仍是 V3；V3 配置弹窗仍存在；集群路由范围需完整浏览器对照                                                                  | [Deployment 证据](./deployment-v3-evidence.md)、[缺口矩阵](./deployment-gap-matrix.md)                                                                                                                              | Codex         | 分析中 | 现有工作负载/Store 测试；131 E2E 待补 |     |
| StatefulSet                      | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、伸缩、重启、删除、配置引用                   | 集群工作负载实现和项目详情外壳                                                                                                                     | 项目列表/详情和操作弹窗仍有 V3；等价性待验证                                                                                           | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| DaemonSet                        | 项目列表/详情使用 V3；集群工作负载路由包含 V4                                                | 编辑、YAML、重启、删除、配置引用                         | 集群工作负载实现和项目详情外壳                                                                                                                     | 项目列表/详情和操作弹窗仍有 V3；等价性待验证                                                                                           | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Pod                              | 项目列表/详情使用 V3 桥接                                                                    | 状态、日志、终端、删除和容器导航                         | `containers/Pods/` 及集群工作负载源码                                                                                                              | V3 列表/详情、终端和日志生命周期需要原生等价实现                                                                                       | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Service / Ingress                | 项目和集群路由含 V3 Embed                                                                    | 创建/编辑/删除、端点、端口和路由                         | `containers/Services/`、`containers/Routes/`                                                                                                       | 项目和集群 Embed 仍在；API 和操作等价性待验证                                                                                          | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| Job / CronJob                    | 项目和集群路由含 V3 Embed                                                                    | 触发/重跑、暂停、历史、删除                              | `containers/Jobs/`、`containers/CronJobs/`                                                                                                         | V3 列表、集群 Embed 和执行流程需要等价验证                                                                                             | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 存储 / 快照                      | 项目和集群路由含 V3 Embed                                                                    | PVC/PV、快照和快照内容操作                               | `containers/Volumes/`、`containers/VolumeSnapshots/`                                                                                               | 多个集群和项目 Embed 仍在                                                                                                              | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 网络 / 告警 / 监控               | 集群和项目范围存在 V3 Embed 和 V3 Action                                                     | 策略、告警、自定义监控                                   | `containers/Network/`、`containers/Alerting/`、监控页面                                                                                            | 范围、操作和可视化等价性待验证                                                                                                         | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 联邦                             | 联邦项目页面主要使用 Wujie Embed                                                             | 跨集群资源查看和操作                                     | `pages/fedprojects/`                                                                                                                               | 尚未映射原生替代方案；RBAC 和数据隔离需单独计划                                                                                        | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |
| 扩展 / 平台 / DevOps / Telemetry | 公共扩展 Embed，以及平台和模块 Embed                                                         | 扩展路由、平台配置、DevOps 和 Telemetry 流程             | 现有扩展和平台源码                                                                                                                                 | 当前启用扩展清单及 V4 契约未完成                                                                                                       | [依赖清单](./dependency-inventory.md)                                                                                                                                                                               | Codex         | 未开始 |                                       |     |

## 全局 P0 风险持续跟踪

- [x] 从 `release-4.1.5` 的 `fc1253cbe` 创建 `feature/v4-migration`。
- [x] 完成 V3/Wujie 静态依赖清单。
- [x] 创建 Deployment 路由、API、Store、操作和缺口文档。
- [x] 完成 `v3dist` 第一轮 REA 制品分析，并在 [REA 阶段分析总结](./rea-analysis-summary.md) 记录证据和限制；该结果为部分覆盖，不代表 P0-REA 通过。
- [x] 在独立 Worktree 形成 [P0-Audit](./p0-audit-evidence.md)、[V3 路由入口库存](./p0-route-inventory.md)、[P0-REA](./p0-rea-evidence.md) 和 [P0-Baseline](./p0-baseline-evidence.md) 首轮证据，并由单 Codex 会话顺序补充 Action 映射、重点 Chunk REA 和源码 provenance；证据已汇入协调分支，等待统一门禁复核。
- [ ] 根据 131 部署版本继续映射所有启用路由和扩展；已完成代表性项目菜单、Wujie frame、直达/刷新/返回、原生详情 Tab、Network 和扩展状态取证，详见 [P0 131 运行时与制品身份证据](./p0-runtime-evidence.md)。该项继续作为全局风险跟踪，不统一阻塞已完成模块级 REA 的开发。
- [ ] 固定旧 V3 源码来源、tag/commit 与当前 `v3dist` 构建 provenance，并完成 P0-REA 门禁复核；候选源码版本、commit 和许可证已固定，但当前制品对应关系仍未关闭。

本轮顺序取证提交：P0-Baseline `be20bc7a3`、P0-Audit `5fc90ebf5`、P0-REA `8c6f59e69`。本轮针对性运行时收尾见 [`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)。这些提交和本轮文档只补充证据，没有修改功能代码、`release-4.1.5` 或部署环境；独立人工/其他复核、联邦 fixture、低权限验证和 131 全量运行时映射仍未完成，因此全局 P0 保持“分析中，待负责人复核”。该结论不阻塞已经完成模块级 REA 的 ConfigMap、Secret、ServiceAccount 收尾工作。

## 历史先行证据（不计入阶段门禁）

- [x] ConfigMap/Secret 项目列表、详情、创建、编辑、删除和批量操作已通过原生浏览器先行验收；该证据不替代 P2-REA 门禁。
- [x] ServiceAccount 项目/集群列表、详情、创建、编辑、删除、角色修改和最小 RBAC 场景已通过先行验收；该证据不替代 P2-REA 门禁。
- [ ] 每一行都有对应 REA 证据、负责人、测试证据和正式 PR 后，才能标记为 `已验收`。

## 重新评估记录（2026-10-16）

本次按 `console-v4-migration-plan.md` 逐项核对后的结论如下：

| 计划项                                 | 当前结论       | 依据和未完成项                                                                                                                                                                                                                         |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布基线                               | 已完成         | `v4.1.5` 与 `release-4.1.5` 均指向 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`；`feature/config-history` 末提交 `2656419bc` 已在基线历史中，分支引用已删除。                                                                            |
| 迁移集成分支                           | 已完成         | `feature/v4-migration` 已在本地和 `origin` 存在；文档提交以该分支当前 HEAD 和 Git 历史为准。                                                                                                                                           |
| 模块短期分支 / PR                      | 部分完成       | `feature/v4-configmaps-secrets` 已创建并推送，草稿 PR [#1](https://github.com/mysStack/console/pull/1) 已指向 `feature/v4-migration`；`feature/v4-resource-framework`、`feature/v4-workloads`、`feature/v4-storage-network` 尚未创建。 |
| P0 静态盘点                            | 部分完成       | 依赖清单、Deployment 证据和缺口矩阵已生成；WSL REA 验证、旧 V3 源码基线、131 全启用路由/扩展映射、V3 Action 完整实测和每行 PR 证据仍未完成。                                                                                           |
| P1 公共底座                            | 未形成完成证据 | 复用了现有 `ListPage`、`DataTable` 和 Store，但 cluster/workspace/project 作用域、缓存隔离、权限和返回恢复的统一验收尚未完成。                                                                                                         |
| P2 ConfigMap / Secret                  | 分析中         | 已有先行实现和 131 列表、详情、创建、编辑、删除、批量删除及最小 RBAC 证据；旧 V3 源码与完整 REA/API/Action/权限/作用域矩阵未完成，尚未通过 P2-REA。                                                                                    |
| P2 ServiceAccount                      | 分析中         | 已有先行实现和 131 列表、详情、创建、编辑、删除、角色修改及最小 RBAC 证据；旧 V3 源码与完整 REA/API/Action/权限/作用域矩阵未完成，尚未通过 P2-REA。                                                                                    |
| M1 Deployment                          | 未完成         | 证据文档已生成，但 V3 Action、131 Network、RBAC、缓存隔离和完整操作矩阵仍未验证。                                                                                                                                                      |
| M2 ConfigMap + Secret + ServiceAccount | 未完成         | 真实操作和最小权限回归已有先行证据，但 P2-REA、完整权限矩阵、跨项目全量隔离和正式 P2-VERIFY 尚未完成，不能标记为 `已验收`。                                                                                                            |
| P3-P8 / release-4.2.0                  | 未开始         | 后续资源迁移、V3/Wujie 清理和 `release-4.2.0` 创建均未达到前置条件。                                                                                                                                                                   |

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
