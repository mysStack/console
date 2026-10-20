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

本轮仍未关闭：完整跨 namespace 正反隔离的最终范围确认、Secret 默认对象语义、联邦资源等价性、全部 V3 功能等价性，以及全局/扩展运行时错误。六种 RBAC 组合的实际正反路径已经单独完成，但三个模块仍不能标记为“已验收”，全局 P0 继续保持“分析中，待负责人复核”。

本次全量文档复核见[文档与流程复核记录](./document-review-2026-10-17.md)。

本轮 P0 针对性风险关闭结果见[P0-U002/U003 风险关闭矩阵](./p0-risk-closure-matrix.md)。该矩阵逐项记录 cluster、workspace、project、federated、platform、extension 的路由、V3/Wujie 入口、静态 RBAC、API/Store、131 证据和 V4 替代边界，并单列 11 个业务 `useV3action` 调用和 3 个桥接文件。静态权限路径和代表性运行时证据均不能替代全量 API RBAC、低权限和错误态验证。

2026-10-19 继续补测应用模板编辑：临时 Application/ApplicationVersion 的编辑描述通过浏览器提交 `PATCH 200`，刷新后数据保持；删除确认框输入名称后提交，捕获 `DELETE 200` 并返回应用模板列表；重新打开删除确认框点击取消，未产生 `DELETE`。ApplicationVersion 未随 Application 自动清理，随后单独删除并确认两个对象均为 `NotFound`。A12 的删除成功和取消子路径已验证，但删除失败、上传和 A09/A11 的完整创建部署链路仍未闭环，不能据此标记应用模块验收。

2026-10-18 在当前工作树复核静态依赖扫描：`wujie-react/WujieReact` 命中 133 个文件、`ConsoleV3ResourceList` 命中 28 个文件、`ExtensionConsoleV3Embed` 命中 17 个文件、`useV3action/useV3Actions` 命中 14 个文件、`consolev3` 路径字符串命中 101 个文件。统计包含构建配置、测试和现有 `packages/shared/lib` 编译输出，存在交集，只用于更新取证范围，不等于启用入口或功能等价通过。详见 [`dependency-inventory.md`](./dependency-inventory.md)。

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

2026-10-19 已完成一次 131 API Server 实际故障注入和恢复验证。通过 `kubectl debug node/dev01` 在宿主机停止 K3s，并用 systemd timer 自动恢复；真实浏览器监控的 ConfigMap、Secret、ServiceAccount 列表请求在故障期间由 `200` 变为 `502`，恢复后 readyz、节点、Console rollout、Pod imageID 和三个页面均恢复。35 组样本和验证边界见 [`api-server-fault-verify-20261018.md`](./api-server-fault-verify-20261018.md)。该项只关闭 API Server 故障环境证据缺口，不代表全部 V3 Action 或模块级 VERIFY 已完成。

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

## 2026-10-18 全部业务 V3 Action 等价性跟踪

已把 11 个业务调用文件拆成 12 个业务 Action 行，逐项记录旧源码、当前 V4 替代边界和运行时状态，见[全部业务 V3 Action 等价性矩阵](./v3-action-equivalence-matrix-20261018.md)。当前仅 ConfigMap、Secret、ServiceAccount 资源自身的基础 Action 已取得模块级证据；工作负载详情、DevOps、通知设置、应用模板、边缘批量操作等调用仍依赖 V3/Wujie 或缺少运行时证据，不能标记为全量等价。

## 2026-10-18 应用模板详情路由和版本列表补测

本轮继续执行未闭环的 V3 业务入口验证，没有重新进行全量 REA。旧制品真实浏览器直达 `/workspaces/test-workspace/apps/stakater-configmap` 时返回原生 `Not Found`；源码核对发现工作区路由未挂载 `appTemplateDetailRoutes`，且路由参数 `appId` 与组件和实际链接使用的 `appName` 不一致。提交 `b3e7571b4bddd812dd65fa67ea3741a48c14ef9c` 已完成这两个路由修复。

部署后又发现版本子页面 `VersionListDetail` 仍返回空 Fragment。提交 `57f297f90f40136f57ba1fdd40c1417b17839abd` 恢复原生 `VersionList` 和上传版本入口，并增加回归测试。该提交本地 `./scripts/test.sh` 为 61 个文件、236 个测试通过，变更文件 ESLint、Prettier、`git diff --check` 和 `corepack yarn build:packages` 通过；GitHub Actions Run `39132471323` 的 Unit tests 和 Build and publish 均成功。

131 部署及浏览器证据：

- 镜像 tag：`feature-v4-configmaps-secrets-20261018-214008-57f297f90f40`。
- 多架构 index digest：`sha256:24a0b0ed8d1b51afdaac381df715fc82529b342fb621b22a844aef2af0865041`。
- Deployment `ks-console` generation/observedGeneration `517/517`，副本 `1/1` Ready；Pod `ks-console-58975f9479-vpx2b` 为 `Running/Ready`，实际 imageID 为 `sha256:3e299d0217e60ab90258830bc21cce12e61fbafc2f075792cbb3658c0e28bc62`。
- 真实浏览器登录后，直达应用模板详情自动进入 `versions`；应用详情 API、版本列表 API 和 3 个版本详情 API 均为 `200`。页面渲染 1.0.5、1.0.2、1.0.1 三个版本，总数为 3；展开版本可见 Chart Files、Version Information、Deployment 和 View in Store；Upload Version 弹窗可以打开，Cancel 可以关闭，未产生写操作。

本轮只关闭了应用模板详情路由和版本列表的渲染缺口，不能把 A09/A12 标记为完整等价：A09 的项目“从应用模板创建”仍缺少可用模板 fixture；A12 的编辑保存、删除、上传成功、失败/取消完整路径和 V3 Action 移除仍未闭环。此前真实浏览器点击详情页 Edit 出现的页面空白已由后续制品修复并完成表单渲染复验，不能再作为当前制品缺陷，但也不能扩大为编辑写入等价通过。`/consolev3/dashboard` 预加载和扩展初始化错误仍按负责人指令延期，不能作为迁移通过证据。

## 2026-10-18 应用模板编辑表单补测

在最新部署制品 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b` 上，使用真实浏览器登录后直达 `/workspaces/test-workspace/apps/stakater-configmap/versions`，打开“编辑”弹窗并完成页面截图核对。此前页面空白的两个问题分别由 `5371d69470e4`（分类名称缺失时的显示回退）和 `7ba63676c`、`1f711bb66b3b`（V2 应用对象到编辑表单及 PATCH 数据的映射）修复。

本次实际看到名称 `configmap`、描述、分类 `kubesphere-app-uncategorized`、图标和服务商网站均正确回填；弹窗未再出现 `toUpperCase` 导致的空白页。点击“取消”后弹窗关闭，仍停留在版本列表页，没有产生写请求。Deployment generation/observedGeneration 为 `519/519`，Pod `ks-console-797469cf84-mgndq` 为 `Running/Ready`，实际 imageID 对应 manifest digest `sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。

本次只关闭 A12 的“编辑表单渲染、字段回填和取消”子缺口。应用模板编辑保存、删除、上传成功、上传失败/取消完整路径、项目从模板创建，以及 V3 Action 移除仍未验证；扩展初始化错误继续按负责人指令延期。

## 2026-10-19 全部业务 Action 针对性补测

- A01：在当前 131 制品上，ConfigReference 的 Deployment 入口完成引用展示、前缀写入、清除和 API 持久化验证；StatefulSet、DaemonSet 入口完成页面、引用和 API `200` 验证。三个入口均仍观测到 `/consolev3/dashboard` 兼容请求，主工作负载编辑仍未完成 V4 原生等价。
- A05/A09/A11：项目应用模板、边缘应用创建入口和“从应用模板”抽屉均能渲染；当前企业空间模板列表为空，未执行创建或部署写操作，成功/失败/取消和 V4 替代仍未验证。

本轮没有修改 `release-4.1.5`，没有删除 V3/Wujie 桥接，也没有把空数据态或兼容壳页面标记为等价通过。A02、A06～A08、A10、A12 的完整成功/失败/取消、RBAC 和 V4 替代证据仍未闭环。

本轮进一步检查 A06～A08：DevOps 页面请求企业空间集群列表但当前 `test-workspace` 没有可选集群，页面显示“请选择集群”和空列表，无法触发 `devops.create/edit`；用户菜单实际没有“通知设置”入口，`notification.user.setting` 当前没有可触发入口。以上保持未验证，不能以空页面或隐藏入口推断功能等价。

A02：在 `v4-migration-e2e` 创建副本数为 0 的专用 Deployment，真实浏览器直达项目详情后页面进入 `resource-status`，显示编辑信息、编辑设置、编辑 YAML 等入口；详情请求为 `200`，点击“编辑信息”可打开原生信息弹窗并取消。页面同时实际请求 `/consolev3/dashboard`，因此项目 Deployment 详情仍保留 V3/Wujie 兼容耦合，A02 不得标记为 V4 等价。

A10：只读检查确认当前集群没有 Edge/EdgeWorkload 相关 CRD 或 API Resource；现有项目也没有可触发边缘工作负载列表的应用模板 fixture。因此边缘工作负载批量删除没有执行，保持未验证。

### 2026-10-19 Deployment、StatefulSet、DaemonSet 详情原生化增量

提交 `3a14e96f1` 已将项目 Deployment、StatefulSet、DaemonSet 详情路由切换到已有原生 Workload Detail，并在 131 完成构建制品、rollout 和真实浏览器复验。三个详情页请求工作负载 API 并渲染原生资源状态页，没有 `wujie-app` 元素；镜像 tag 为 `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，Pod imageID 对应 manifest digest `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`。

该增量仍不是完整 V3 等价：应用启动层继续预加载 `/consolev3/dashboard`，原生 YAML 编辑器尚未完成与旧模板编辑表单的全部字段、失败/取消、低权限和刷新返回逐项对照。A02～A04 状态更新为“部分验证”，全局 P0 和全部 V3 功能验收状态不变。

## 2026-10-19 应用模板远程选择和项目安装补测

在当前 131 部署制品上，使用专用临时账号通过真实浏览器进入 `v4-migration-e2e` 项目应用页面，选择 `stakater/configmap` 远程模板，输入唯一名称并完成安装。浏览器捕获 Application `POST 200`，应用列表刷新后显示测试应用，详情、资源状态、应用模板和应用设置页面均可渲染，相关详情和版本 API 返回 `200`。

本轮部署制品为 `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，manifest digest 为 `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`；Pod `ks-console-57fcd4d59f-sn5cp` 为 `Running/Ready`，实际 imageID 与该 digest 一致。

## 2026-10-19 当前制品未闭环入口复核

在当前部署制品 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`（manifest digest `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`）上，真实浏览器重新复核了 A05～A12 的可触发入口边界：DevOps 页面没有可选集群，应用模板抽屉没有资源，上传版本弹窗可打开并取消，用户菜单没有通知设置，当前集群没有 Edge/EdgeWorkload 资源。以上结果只证明当前环境的入口与空数据/取消行为，不能替代成功、失败、权限、刷新返回和 V4 原生替代验证。

本轮发现此前安装测试遗留的唯一临时 Application `v4-app-template-20261019`、对应版本和 Helm 安装 Job；已按测试名称删除并复核不存在，`v4-migration-e2e` namespace 未删除。ConfigMap、Secret、ServiceAccount 的模块级验收状态不变，全部 V3 功能等价性仍未完成。

平台作用域补测使用临时用户和临时聚合 GlobalRole 只读打开了工作空间、集群、用户、扩展中心和平台设置页面；临时 IAM 对象已经删除并复核不存在。由于聚合控制器展开了全局模板规则，本次只作为路由渲染证据，不能证明平台最小权限写拒绝或扩展 Action 等价。

A12 上传成功子路径已在当前 131 制品上补闭环：真实浏览器上传专用 Chart `v4-action-upload-20261019.tgz`，校验请求和版本创建请求均返回 `200`；刷新后版本 `9.9.19` 显示为“未提交”，随后删除该专用 ApplicationVersion 并确认页面恢复原有 3 个版本。A12 的失败/冲突、低权限和 V3 Action 移除仍未完成，应用模板模块继续保持“VERIFY 部分通过，待补齐”。

## 2026-10-19 应用模板版本上传缺口修复与部署复验

真实浏览器发现版本上传校验成功后，提交数据没有保留应用名和版本名，随后又确认版本接口要求 `appType: helm`。已补充上传数据回归测试并提交 `0fff169bd`、`58de31e58` 修复；本地目标测试、ESLint、Prettier、`git diff --check`、完整测试（67 个测试文件、246 个测试）和 `corepack yarn build:packages` 均通过。

GitHub Actions Run `39209219839` 成功，镜像 tag 为 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`，manifest digest 为 `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`。131 rollout 成功，Deployment generation/observedGeneration 为 `523/523`，Pod `ks-console-6dcf5456c4-7tvhx` Ready，实际 imageID 与该 digest 一致，`/readyz` 通过。

部署后浏览器重新检查了上传入口、Chart 校验 `200`、版本元数据和刷新路径；本轮没有取得可独立引用的最终上传 HTTP `200` 及完整成功截图，因此 A12 上传成功仍为“未闭环”，不能只凭本地测试、CI 或 API 请求形态标记通过。冲突/失败反馈、低权限和 V3 Action 移除仍未完成。临时 Application、ApplicationVersion、测试账号、绑定和上传文件均已清理，`v4-migration-e2e` namespace 保留。

首次访问详情页时，后台系统网关请求返回 `403`，全局错误处理跳转到 `/errors/403`；补充临时集群管理员绑定后详情页恢复。该绑定仅用于定位测试环境权限条件，已与临时 Application、版本、账号及其他绑定一并清理。A09/A11 现在有真实成功子路径证据，但失败/取消、低权限和完整 V4 替代仍未闭环，不能标记为已验收。

## 2026-10-19 A12 上传失败反馈修复与模块级验证更新

本轮继续推进全部 V3 Action 等价性中的 A12。真实浏览器确认应用模板版本页实际加载远程 `/pstatic/dist/openpitrix/index.js`，此前本地 `PackageUpload` 组件修复未覆盖该入口；无效 Chart 校验接口返回 `500` 后页面会停留在“正在上传”。

提交 `6acdc3b2fc52a3264ee58a2bb9270cd630e7dc44` 在共享请求层仅针对 `application.kubesphere.io/v2/.../versions?validate=true` 归一化校验失败响应，并新增回归测试。`./scripts/test.sh` 通过（68 个测试文件、248 个测试），`corepack yarn build:packages` 通过，GitHub Actions Run `39267930049` 成功。

131 当前部署制品：`feature-v4-configmaps-secrets-20261019-222044-6acdc3b2fc52`，manifest digest `sha256:99ca60b78572916ad45342fcc752e7966a8bd6fb57e4db5108acfc6a6e996b20`，Pod `ks-console-7f96d678f-7k64b` 为 `Running/Ready`，实际 imageID 与 digest 一致。真实浏览器验证无效 Chart 已从“正在上传”进入“出现错误，请重试”，有效 Chart `9.9.20` 完成校验和版本创建，专用 ApplicationVersion 已删除并确认不存在。

该修复关闭 A12 的上传失败反馈和有效提交子路径，但 A12 仍为“部分验证”。完整 RBAC 作用域矩阵、全部 V3 Action 等价性和扩展运行时错误仍未闭环；扩展错误按负责人要求暂缓。

## 2026-10-20 RBAC 平台与项目隔离补测

在 131 使用真实浏览器补充了平台只读和仅项目 viewer 两个作用域组合：平台只读账号可打开工作空间、集群和用户列表，读取请求为 `200`，创建用户、工作空间和集群均被拒绝为 `403`；仅项目账号直接访问项目资源时 ConfigMap GET 为 `200`、POST 为 `403`，直达项目路由进入 `/errors/403`。全部临时 IAM 对象均已删除并复核不存在。

该证据补齐了平台只读和项目隔离的实际边界，但不代表联邦、DevOps、扩展 Action 或全部 V3 Action 已完成验证。

## 2026-10-20 DevOps 作用域补测

真实浏览器分别使用 `dev-workspace` viewer 和平台管理员检查 DevOps 页面。两类账号均能打开页面和创建弹窗，但集群选择器显示 `host：未安装 DevOps`。viewer 的 DevOps 列表 GET 为 `404`、创建为 `403`；平台管理员的列表 GET 和创建均为 `404`。创建弹窗取消路径没有写入。

该证据确认当前环境缺少 DevOps 扩展/API，A06/A07 继续保持未验证，不能用空数据态或弹窗渲染替代成功、失败、权限和刷新等价性证据。

## 2026-10-20 联邦项目与 Edge 入口运行时补测

本轮使用真实 Playwright 对联邦项目和 Edge 节点入口进行只读核验。联邦项目页面可以渲染列表和创建弹窗，但当前没有联邦项目，`host` 仅显示为主集群且添加集群按钮禁用；Edge 节点页面可以渲染空数据态，带 Edge 标签选择器的节点列表请求返回 `200`。当前集群没有可用的 FederatedProject/FederatedResource、EdgeWorkload 等 API/CRD，未创建任何资源，也没有提交联邦项目表单。

本轮补充了 A05/A10 的入口、空数据态和环境边界证据，但没有关闭成功、失败、取消、RBAC、刷新返回或 V4 原生替代验证；联邦页面仍加载 `/consolev3/dashboard` 与 `v3dist` 资源。A05/A10 继续标记为“环境不可执行/未验证”，三个目标资源模块的状态不变，全部 V3 功能等价性仍未完成。

## 2026-10-20 RBAC 项目只读与平台只读完整 CRUD 复核

本轮重新使用有效的仅项目 `viewer` 账号验证 ConfigMap、Secret、ServiceAccount、Deployment：四类资源 GET 均为 `200`，POST/PUT/PATCH/DELETE 均为 `403`，Deployment 原生详情页正常渲染。随后使用只绑定临时 GlobalRole 的平台只读账号验证同一四类资源：列表/详情均为 `200/200`，POST/PUT/PATCH/DELETE 均为 `403`。两组临时账号、绑定、GlobalRole、Workload 和资源均已清理，`v4-migration-e2e` 只剩系统对象。

这轮关闭了此前 `projectonly` 有效登录上下文差异，并补齐平台只读对四类目标资源的完整 CRUD 拒绝证据；联邦、DevOps、Edge、Extension 以及全部 V3 Action 的全量 RBAC 仍未完成。

## 2026-10-20 扩展 API 与安装状态口径修正

只读复核发现当前集群并非没有扩展 API：`extensions.kubesphere.io/v1alpha1` 下的 `APIService`、`JSBundle` 等资源存在，`copilot`、`whizard-telemetry`、`kubeeye`、`gateway` 的 APIService 状态为 `Available`，并有多个已安装扩展的 JSBundle。缺失的是目标业务能力：`devops` Extension 没有 `Installed` 状态，当前 DevOps 列表 API 仍返回 `404`；没有可用的 FederatedProject/FederatedResource 或 EdgeWorkload API/CRD；`whizard-notification` Extension 没有 `Installed` 状态，用户通知设置入口仍不可触发。

因此，扩展状态只能作为环境能力证据，不能替代 A05～A08 的运行时成功、失败、取消、权限和 V4 替代行为验证；之前将“没有扩展 API/CRD”作为整体结论的表述已废弃。

## 2026-10-20 测试 namespace 残留复核与清理

在继续运行时核验前，对 `v4-migration-e2e` 做了只针对测试命名和测试标签的资源复核，发现此前应用模板安装与配置历史测试遗留的 Helm ConfigMap、Helm release Secret、应用生成的 `configmapname` 及配置历史 Secret 链。已删除这些明确属于本轮测试的对象，并复核 namespace 当前只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount；没有删除 namespace，也没有修改其他 namespace 或业务资源。

该清理结果修正了此前“测试对象已清理”的记录缺口。后续模块验收必须在测试结束时按唯一名称、标签和 Helm release 关联对象进行二次清理核验。

## 2026-10-20 活动路由与 V3 依赖口径复核

重新以当前分支源码和活动路由树核对后，项目 Deployment、StatefulSet、DaemonSet 详情由 `projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/*/Detail/routes.tsx`，当前活动详情实现使用原生 Workload Detail；旧 `projects/containers/*/Detail` 文件仍保留 Wujie 代码，但没有被该活动路由文件导入，暂列为兼容残留，不能直接删除。

当前非测试源码统计为：`useV3action/useV3Actions` 11 个文件（8 个业务调用文件、2 个桥接实现/Hook 文件、1 个导出文件），`WujieReact` 117 个文件，`consolev3` 121 个文件。历史 P0 统计中的 14 个动态 Action 文件和 11 个业务文件保留为历史基线；当前数字只用于活动源码复核，不代表全仓库 V3/Wujie 已移除。A02～A04 的完整字段、错误态、低权限、刷新返回和兼容残留清理仍未完成。

## 2026-10-20 原生 Workload HPA API 路径缺陷

在真实浏览器访问原生 Deployment、StatefulSet、DaemonSet 详情页时，发现 HPA 请求重复拼接 `/apis/`，实际地址为 `/apis/apis/autoscaling/v2beta2/...`。同一错误请求在控制台日志中重复出现 282 次，并伴随 `Network Error` 和 `ERR_INSUFFICIENT_RESOURCES`。根因、修复和本地验证记录见[原生 Workload HPA API 路径修复记录](./hpa-native-workload-api-fix-20261020.md)。

第一版路径修复部署后，浏览器确认重复 `/apis/apis/` 已消失，但正确 HPA URL 仍被重复请求并触发资源耗尽。根因进一步定位为 `useCacheStore` setter 身份不稳定导致详情同步 effect 循环。第二版 `useCallback` 修复已提交为 `3ee15af9ad2b`，CI Run `39302192970` 成功，并已部署到 131：镜像 tag 为 `feature-v4-configmaps-secrets-20261020-022516-3ee15af9ad2b`，manifest digest 为 `sha256:27d44f7e001a6c5593ce39a5fbde2cb53dcdcb75959ab3a2f57114ee5b3f25b9`，Pod `ks-console-7c875999cf-6zw2g` 为 `Running/Ready`，实际 imageID 一致。Deployment、StatefulSet、DaemonSet 页面复验中重复请求和资源耗尽均为 0，DaemonSet 操作菜单、YAML 弹窗和取消路径可用；A02～A04 的其他功能等价条件仍未完成。

## 2026-10-20 原生 Workload 详情操作补测

在同一第二版制品上，真实浏览器访问 `v4-migration-e2e` 中临时 Deployment、StatefulSet、DaemonSet 的原生详情页。三类页面的资源状态、修改记录、元数据、环境变量、配置引用和事件入口均能渲染；三类“编辑信息”弹窗均可打开，StatefulSet/DaemonSet 取消路径通过，Deployment 提交描述 `v4-a02-verify` 后页面和 Kubernetes API 均一致。Deployment 刷新、浏览器返回以及 DaemonSet 的“更多操作”菜单、原生 YAML 弹窗和取消路径通过。临时资源已清理，namespace 复核无残留测试资源。

该补测只增加 A02～A04 的详情渲染、部分信息编辑、取消、刷新/返回和 HPA 稳定性证据；完整 YAML 持久化、所有操作成功/失败/取消、低权限和 V3/Wujie 兼容残留清理仍未完成，模块不能标记为完整 V3 等价。

同一轮尝试用浏览器编辑器提交 Deployment YAML 描述变更，提交返回 HTTP `400` 且弹窗保持打开。由于自动化输入没有形成完整可引用的编辑器内容，不能将该结果判定为原生 YAML 功能失败；YAML 持久化仍为未验证，测试对象已清理。

## 2026-10-20 A02 YAML 文件导入持久化补测

使用同一 131 制品和真实浏览器对临时 Deployment `v4-yaml-verify-20261020-2` 进行原生 YAML 文件导入补测：从“编辑 YAML”入口导入合法 Deployment YAML，将描述从 `yaml-before` 更新为 `yaml-after`；提交后详情页显示新值，浏览器刷新后仍保持，Kubernetes API 回读注解一致且 generation 由 `1` 变为 `2`。临时 Deployment 已删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。

该证据仅关闭 A02 的合法 YAML 导入、提交、刷新和 API 持久化子路径；StatefulSet/DaemonSet YAML、非法 YAML、resourceVersion 冲突、低权限及全部 V3 等价条件仍未完成。

## 2026-10-20 A03/A04 YAML 文件导入持久化补测

使用真实浏览器在 StatefulSet、DaemonSet 原生详情页分别导入合法 YAML，将描述更新为 `yaml-after-sts`、`yaml-after-ds`；提交后页面显示新值，刷新后仍保持，Kubernetes API 回读注解一致。两个临时对象已删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。

该证据关闭 A03/A04 的合法 YAML 导入、提交、刷新和 API 持久化子路径；非法 YAML、冲突、低权限、全部操作错误态和 V3 等价条件仍未完成。

## 2026-10-20 A02 非法 YAML 错误态补测

真实浏览器在临时 Deployment 的原生“编辑 YAML”中导入缺少 `apiVersion`、`kind` 和 `metadata.name` 的非法文件；提交返回 `400 BadRequest`，页面显示错误信息且编辑对话框保持打开，Kubernetes 对象 generation 未变化。临时对象已删除。该项关闭 A02 非法 YAML 错误反馈和不写入保护；A03/A04 及冲突、低权限和完整 V3 等价条件仍未完成。

## 2026-10-20 模块级 VERIFY：YAML 并发冲突保护

提交 `4042f9570a8edf85e20ce43717c1cdf3b3a4f1bd` 修复原生 Workload YAML 编辑提交的 resourceVersion 处理：提交使用编辑器打开时的版本，服务端发现对象已被外部修改时返回冲突，避免先 GET 最新对象再静默覆盖并发变更。

部署证据：GitHub Actions Run `39315775014`；镜像 `feature-v4-configmaps-secrets-20261020-040218-4042f9570a8e`；manifest digest `sha256:1c59602033e75e14d60e769e1de25bf16db20e962a9d504ee40f991e5f879878`；Pod `ks-console-6f98cccdf7-jd5kz` 已 Ready，imageID 与 digest 一致。

真实浏览器验证 Deployment `v4-conflict-fix-20261020`：外部先修改描述，浏览器随后提交旧 resourceVersion 的 YAML，收到 `409 Conflict`，页面保留错误和编辑弹窗；API 中外部描述仍保留、generation 未因失败提交继续变化。临时资源已清理。

状态：A02 的并发冲突保护已验证；A03/A04 尚未分别验证该冲突路径，三类 Workload 的完整 V3 等价、全部 RBAC 组合和兼容残留清理仍未完成。

## 2026-10-20 A03/A04 YAML 并发冲突补测

在当前 131 部署制品上，分别对临时 StatefulSet `v4-conflict-sts-20261020` 和 DaemonSet `v4-conflict-ds-20261020` 使用真实 Playwright 执行 YAML 并发修改：浏览器保存旧 `resourceVersion`，外部 API 先修改描述，再提交旧 YAML。

两类资源的浏览器 `PUT` 均返回 `409 Conflict`，编辑对话框保持打开；Kubernetes API 中的外部描述分别保持为 `conflict-external-sts`、`conflict-external-ds`，generation 均未因失败提交继续变化。临时对象已删除。

该补测与 A02 的同类证据合并后，A02/A03/A04 三类 Workload 的 resourceVersion 冲突保护子路径已验证。完整字段、所有操作成功/失败/取消、全量 RBAC 组合、V3/Wujie 清理和其他 V3 Action 仍未完成。

## 2026-10-20 A03/A04 非法 YAML 错误态补测

在 131 当前制品上，StatefulSet `v4-invalid-sts-20261020` 和 DaemonSet `v4-invalid-ds-20261020` 分别导入缺少 `apiVersion`、`kind` 和资源名称的非法 YAML。两类资源的浏览器 `PUT` 均返回 `400 Bad Request`，编辑对话框保持打开；API 回读确认 `resourceVersion` 与 generation 未改变。临时资源已删除，namespace 无测试残留。

该补测关闭 A03/A04 非法 YAML 错误反馈和不写入保护子路径；A02～A04 的完整字段、全部操作组合、全量 RBAC 和 V3 等价仍未完成。

## 2026-10-20 A02/A03/A04 operator RBAC 正向补测

使用临时项目 operator 用户和真实浏览器访问临时 Deployment、StatefulSet、DaemonSet 详情页，三类页面均正常渲染。浏览器会话内三类 Workload 的 GET、PUT、PATCH、POST、DELETE 状态均为 `200/200/200/201/200`；所有临时用户、绑定和 Workload 已清理。

结合已有项目 viewer 的 `GET 200、POST/PUT/PATCH/DELETE 403` 证据，A02～A04 当前项目 operator/viewer 正反读写边界已验证。其他作用域、完整错误态、全量 RBAC 组合和 V3 等价性仍未完成。

## 2026-10-20 Workload 作用域 RBAC 补测

真实浏览器核对 A02 Deployment 的两个作用域组合：仅企业空间 viewer (`workspaceonly`) 访问项目详情进入 `/errors/403`，API 的 GET/POST/PUT/PATCH/DELETE 均为 `403`；企业空间 viewer 加集群 viewer (`clusterviewer`) 可以渲染项目详情，GET 为 `200`，所有写操作为 `403`。临时用户、绑定和 Workload 已删除。

该结果补齐了 Workload 作用域边界，且明确不能沿用 ConfigMap/Secret/ServiceAccount 的旧读取结果。A02～A04 当前已有 viewer、operator、workspaceonly、clusterviewer 证据，projectonly、admin 独立组合、平台/联邦/DevOps/Extension 作用域和全量 V3 等价仍未完成。

## 2026-10-20 Workload projectonly RBAC 补测

仅项目 viewer、没有企业空间绑定的临时账号通过真实浏览器访问 Deployment 详情时页面正常渲染；同一浏览器会话中 GET 为 `200`，POST/DELETE 为 `403`。临时账号、RoleBinding 和 Workload 已清理。

该结果与早期 ConfigMap 项目入口记录存在差异，已作为资源类型差异保留，不能跨模块推断统一页面权限。A02～A04 的 Workload projectonly API 边界已验证，admin 独立组合和全量 RBAC 仍未完成。

## 2026-10-20 A12 当前制品上传和 RBAC 补测

在 Run `39315775014` 对应的 131 制品上，真实浏览器上传合法 Chart 版本 `9.9.21`：校验和版本创建请求均为 `200`，页面显示上传成功；API 回读为 `200`，删除测试版本后回读为 `404`。缺少 `Chart.yaml` 的非法 Chart 校验返回 `500`，页面显示“出现错误，请重试”且弹窗保持打开。临时 workspace viewer 的版本列表 GET 为 `200`、创建 POST 为 `403`，没有留下对象。

该补测增加了 A12 当前制品的成功、失败反馈和低权限证据，但冲突、删除失败、完整 V3 Action 移除和全量应用模板 RBAC 仍未完成。
2026-10-20 A09 补测通过 `stakater` 系统仓库的真实应用模板选择和原生安装提交，浏览器 POST 返回 `200`；但 131 单节点 CPU 不足，Helm 安装 Job Pending，未取得部署成功证据。测试 ApplicationRelease、Job 和安装 ConfigMap 已清理，A09 继续为“部分验证”。同轮重新核对 Workload `projectonly` 组合时，当前制品的页面和 GET/POST/PUT/PATCH/DELETE 均返回 `403`，与历史 `GET 200` 记录不一致，已标记为结果不一致，不能作为全量 RBAC 通过证据。
2026-10-20 A02～A04 独立 admin 正向 RBAC 补测：Deployment、StatefulSet、DaemonSet 详情页均渲染原生操作入口，浏览器会话内 GET/PUT/PATCH/POST/DELETE 均为 `200/200/200/201/200`，临时对象已清理。该结果补齐 Workload admin 组合，但不关闭 `projectonly` 结果不一致、其他平台作用域或全部 V3 功能等价性。

A11 边界修正：本轮应用模板安装实际走原生 `deployApp`，没有触发 `batch.deploy.app.create.v2`；该 V3 Action 仅在 Edge 应用分支中打开，而当前集群没有 Edge fixture。因此原生 Helm 安装提交不能写成 A11 的 V3 Action 等价通过，A11 继续保持部分验证。

## 2026-10-20 API Server 实际故障扩展复测

在 131 测试环境按授权停止并恢复 K3s，真实浏览器连续采样 103 组请求。ConfigMap、Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet 六类 Kubernetes 资源列表在故障期间均出现 `502/503`，恢复后全部回到 `200`；应用列表 API 本轮 103 组均为 `200`，不扩大解释为应用模块故障恢复已验证。恢复后 `readyz`、节点、Console Deployment、Pod 和浏览器登录均正常，实际 Pod imageID 与当前部署 digest 一致。该证据扩展了 API Server 故障环境覆盖范围，但仍不关闭全部 V3 功能等价性、全量写操作和全局 RBAC 门禁。

## 2026-10-20 Workload projectonly 有效账号复核

使用只绑定项目 `viewer`、带有效邮箱且 Active 的临时账号，真实浏览器打开 Deployment、StatefulSet、DaemonSet 详情页，三类页面均正常渲染；三类资源 API 均为 GET `200`、POST/PUT/PATCH/DELETE `403`。该结果复现此前有效账号的读写边界，但与另一个账号上下文的全部 `403` 结果仍不一致，因此保留为待解释差异，不把 Workload `projectonly` 标记为全量 RBAC 通过。

## 2026-10-20 当前制品原生 Workload 与应用模板页面复核

在当前 HEAD `c3fa230ec3877bfe8bcafd48ee416b1014dbc1da` 对应的 131 制品上，使用真实 Playwright 登录平台管理员，创建临时 Deployment、StatefulSet 和 DaemonSet 并分别打开项目原生详情页。Deployment 页面实际渲染资源状态、修改记录、元数据、环境变量、配置引用和事件入口；“更多操作”菜单显示回退、编辑自动扩缩、编辑设置、编辑 YAML、重新创建和删除等原生操作入口。应用模板详情页的“编辑信息”弹窗也能正常渲染并回填基本字段，取消后未产生写请求。

本轮只验证页面渲染和操作入口存在，没有逐项提交所有操作，也没有把入口存在当作 V3 功能等价通过。临时 Workload 已删除，`v4-migration-e2e` 最终只保留系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount；当前镜像 tag 为 `feature-v4-configmaps-secrets-20261020-105412-1c54df98d124`，Pod imageID 对应 manifest digest `sha256:49febd89201b7a887d30928ae31a3b296d459ed18dc7811b550a14719556fab2`。

A02～A04 的完整成功、失败、取消操作组合、全量 RBAC 作用域和 `/consolev3/dashboard` 兼容预加载仍未关闭；A12 的原生编辑表单渲染和取消子路径已确认，但完整保存失败、冲突、低权限和制品内 V3 Action 移除仍未完成。

## 2026-10-20 平台只读作用域覆盖三类配置资源

真实 Playwright 使用临时平台只读用户访问 `v4-migration-e2e` 的 ConfigMap、Secret、ServiceAccount 页面。三类资源列表 GET 均返回 `200`，创建 POST 均返回 `403`；页面均能渲染，ConfigMap 只显示当前 namespace 对象。临时用户、GlobalRole 和 GlobalRoleBinding 已删除，namespace 无拒绝请求对象残留。

该补测关闭平台只读角色对三个目标资源的读取/创建拒绝缺口。它不扩大为平台全部写操作、联邦/DevOps/Extension 作用域或全部 V3 功能等价性通过；Workload `projectonly` 的历史结果差异仍需独立解释。

## 2026-10-20 三项专项测试复核

本轮基于当前分支提交 `b2bd7bf639ae0e42cbd92e4787d93dbf666a902a` 和 131 已部署制品执行，不重新初始化项目，不修改稳定分支。

| 专项                    | 当前结论           | 实际证据                                                                                                                                                                                                                         |
| ----------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 完整 RBAC 组合矩阵      | 未完成             | ConfigMap、Secret、ServiceAccount 已覆盖项目/集群六种组合及平台只读读写边界；Workload 和四类目标资源的有效 `projectonly`/平台只读 CRUD 边界已补测；联邦、DevOps、Extension 和全部动态 Action 的全量组合仍无完整 fixture/后端能力 |
| 全部 V3 功能逐项等价性  | 未完成             | A01～A12 仍有部分验证、未验证和环境不可执行项；源码仍有 `useV3action/useV3Actions`、Wujie 和 `consolev3/v3dist` 运行时残留，不能宣称全部 V4 原生化完成                                                                           |
| API Server 实际故障环境 | 已完成（限定范围） | 本轮真实停止/恢复 K3s，7 个接口各采样 60 次，共 420 组浏览器样本；六类 Kubernetes 列表在故障期间出现 502/503，恢复后回到 200；Application 对照接口 60/60 为 200；readyz、节点和 Console rollout 均恢复                           |

本节的“已完成（限定范围）”只表示 API Server 故障注入、恢复和上述列表接口的浏览器/API链路已验证；不能扩展为全平台故障兼容或全部 V3 等价通过。

本轮又在项目 Workload 原生桥清理对应的制品 `d091cb1cdc3d271e1632ed569decc9aeac75fb31` 上复测 API Server 实际故障：7 个接口各采样 60 次，ConfigMap 为 `200=24/502=24/503=12`，Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet 均为 `200=24/502=25/503=11`，Application 对照接口为 `200=60`。K3s 恢复后 `readyz`、节点、Console rollout 和 Pod imageID 均恢复正常。该结果更新了当前制品的故障证据，范围仍限于列表接口和恢复链路。

## 2026-10-21 通知配置与 V3 资源加载复核

真实浏览器登录当前 131 制品后访问 `/settings/notification-configuration`：V4 外层路由、平台设置页面、静默策略、通知语言、创建按钮和空列表均能渲染；但网络证据显示页面仍请求 `/consolev3/settings/silent-policy`、`/consolev3/dashboard` 以及多个 `/dist/v3dist/*` 资源，通知列表 API `GET /kapis/notification.kubesphere.io/v2beta2/silences?sortBy=createTime&limit=10` 返回 `400`。

该结果补充了 A08 的部署后运行时证据：当前入口依赖 V3/Wujie 兼容加载边界，且通知 API 查询请求存在错误响应。A08 不能标记为 V4 原生等价通过；完整 V3/Wujie 清理和通知功能成功、失败、取消、权限、刷新/返回路径仍未完成。扩展初始化错误按负责人要求暂不处理。

## 2026-10-21 当前制品全入口浏览器复核

当前 131 制品的真实管理员浏览器复核结果如下：

| 入口      | 实际结果                                                                                                       | 当前判定                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| DevOps    | `/workspaces/test-workspace/devops` 正常渲染；企业空间集群列表为 `200`，页面显示“请选择集群”、创建入口和空列表 | 入口已验证；DevOps 成功、失败、取消和低权限仍未验证         |
| 联邦项目  | `/workspaces/test-workspace/federatedprojects` 正常渲染，但没有联邦项目 fixture                                | 入口部分验证；FederatedProject/FederatedResource 等价未验证 |
| Edge 节点 | `/clusters/host/edgenodes` 正常渲染，Edge 节点列表请求 `200` 但为空                                            | 入口部分验证；EdgeWorkload 和批量 Action 未验证             |
| 通知设置  | 访问 `/settings/notification-configuration` 后进入 `/settings/silent-policy`；通知 silences 请求 `400`         | A08 未验证；仍加载 `/consolev3` 和 `/dist/v3dist`           |
| 应用模板  | `/workspaces/test-workspace/apps/stakater-configmap` 原生版本页渲染，详情/版本读取 `200`                       | A09/A12 继续部分验证；仍有 V3 预加载                        |

本轮为当前制品补充了逐入口浏览器证据，但没有把空数据态、页面可达或只读接口成功当作全部 V3 等价通过；A01～A12、完整 RBAC 组合和 V3/Wujie 清理结论保持原状态。

## 2026-10-21 A02～A04 编辑与 YAML 取消复核

在当前 131 已部署制品上创建临时 Deployment、StatefulSet、DaemonSet 和 Service，并通过真实浏览器访问三个项目原生详情页。三类页面的“编辑信息”均提交成功，描述注解经页面和 Kubernetes API 回读一致；三个页面的“编辑 YAML”弹窗均可打开并取消，未产生写请求；更多操作菜单按资源类型显示回退、自动扩缩、编辑服务、编辑设置、编辑 YAML、重新创建和删除等入口。

本轮临时资源已删除，namespace 无测试残留。该证据补充 A02～A04 当前制品的编辑成功、菜单渲染和 YAML 取消子路径；StatefulSet/DaemonSet YAML 成功写入、全部操作成功/失败/取消、低权限和 V3/Wujie 兼容残留仍未闭环。

## 2026-10-21 A02～A04 删除路径复核

当前 131 制品上，Deployment、StatefulSet、DaemonSet 的删除确认框均要求输入准确资源名称；三个确认框点击取消均未发送删除请求。随后对本轮临时对象执行管理员删除，三类页面均显示删除成功并返回对应列表，Kubernetes API 复核资源均为 `NotFound`。

该证据补充 A02～A04 的删除成功和取消子路径；删除失败、低权限删除拒绝、回滚、伸缩、重启和全量 V3 等价仍未完成。

本轮还在临时 Deployment 上生成两条修改记录，真实浏览器执行“回退”并选择目标记录 `#1`；确认后 Kubernetes API 回读镜像由 `busybox:1.36` 恢复为 `busybox:1.35`，generation 由 `2` 变为 `3`，随后清理临时对象。该证据补充 A02 的管理员回滚成功子路径，A03/A04 回滚和全部操作等价仍未完成。

## 2026-10-20 当前项目 Workload V3 兼容桥清理

已确认项目 Deployment、StatefulSet、DaemonSet 的旧 V3 详情包装器没有活动路由或源码消费者，当前活动路由使用原生 Workload Detail 和原生 ConfigReferencePage。本轮删除无消费者的旧项目详情包装器、ConfigReference V3 DOM 注入桥及其专用测试/辅助文件，并新增回归断言防止旧项目包装器重新出现。

联邦项目路由仍直接使用 `fedprojects/containers/*` 的 V3 包装器，因此本轮只关闭当前项目活动详情的静态桥接缺口；联邦资源的 V4 原生替代和运行时等价仍未完成。删除后本地 `./scripts/test.sh` 为 65 个测试文件、206 个测试通过，`corepack yarn build:packages` 成功；部署后浏览器复验仍需在新制品上完成。

## 2026-10-20 项目 Workload 兼容桥清理后的部署验收

本轮提交 `d091cb1cdc3d271e1632ed569decc9aeac75fb31` 已通过 GitHub Actions Run `39398988900` 的 Unit tests 和镜像构建。按分支、上海时间和 commit 短 SHA 生成的镜像为 `feature-v4-configmaps-secrets-20261020-171341-d091cb1cdc3d`，manifest digest 为 `sha256:1b82acae4539989150585dfd3e68376ad9bbb957302d82adb98bb19b4d58ce6e`。131 的 `ks-console` rollout 为 `548/548`，副本为 `1/1/1/1`，Pod `ks-console-f9958ffcd-8sd9z` 为 Running/Ready，实际 imageID 与该 digest 一致；`/readyz` 返回 `ok`。

使用真实浏览器登录后，在专用 namespace 创建临时 Deployment、StatefulSet 和 DaemonSet，并分别直达三个项目详情 URL。三页均进入原生详情页并渲染资源状态、属性、修改记录、元数据、环境变量、配置引用和事件入口，容器组列表均显示 `1/1`。验证完成后只删除本轮资源，`v4-migration-e2e` 最终只保留系统 `kube-root-ca.crt` 和 `default` ServiceAccount。

本轮浏览器控制台仍记录已知扩展初始化错误（包括 `getExtensionConsoleV3Embed is not a function`）；该问题属于已登记的扩展运行时范围，本轮不处理，也不把它写成 Workload 原生详情路由通过。新制品上的项目 Deployment、StatefulSet、DaemonSet 原生入口已完成部署后浏览器验收，但全部操作等价、全部 V3 功能逐项等价和完整 RBAC 组合矩阵仍未完成。

本轮继续用真实浏览器检查当前制品的 A02～A04 操作入口。Deployment 的回退、自动扩缩、编辑 YAML、删除确认均能打开并取消；重新创建提交后 generation 从 `1` 变为 `2`，新 Pod 恢复 `Ready`。StatefulSet 的回退、自动扩缩、编辑服务、编辑设置、编辑 YAML、重新创建和删除入口均渲染；DaemonSet 的回退、编辑设置、编辑 YAML、重新创建和删除入口均渲染。本轮没有对 StatefulSet、DaemonSet 提交写操作，三类临时 Workload 已清理。该补测只扩大 A02～A04 的入口和取消/重新创建证据，不改变全量 V3 等价性为未完成的结论。
