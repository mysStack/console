# 当前 Workload 执行路线（2026-10-25）

> **最新状态（2026-10-25，详情页错误状态已完成部署复验）**：三类详情页不存在资源的真实 404 均已在 131 当前制品跳转 `/404` 并显示资源不存在；浏览器 route mock 的 403 跳转 `/errors/403`、500 显示详情加载失败提示也通过。当前制品为 CI Run `40145235328`、镜像 `feature-v4-workloads-20261025-080541-0fefb30b3360`、digest `sha256:7467bdb6fb1600575af5cab54da59a0f43b9fdce8d4e75ddb382de0cdb36ae68`，rollout generation `608`、Pod imageID 一致。该项已关闭，Workload 其他 RBAC、缓存、Action、逐项等价和完整错误矩阵仍处于 `VERIFY / 未完成`。

> **本轮证据**：DEV 修复见 [`workload-detail-error-state-dev-20261025.json`](./evidence/workload-detail-error-state-dev-20261025.json)，部署后浏览器复验见 [`workload-detail-error-state-verify-20261025.json`](./evidence/workload-detail-error-state-verify-20261025.json)。403/500 本轮为浏览器 route mock，只证明页面状态处理，不替代真实低权限 RBAC 和网络环境证据。

> **退回 DEV 的缺陷记录**：在提交 `4b363c688f1e784acb68fe32117756f03bb55bd2` 制品上发现非法 YAML 会发起 PUT 并返回 400，但页面没有可见错误反馈。该缺陷已记录并完成 DEV 修复，证据见[非法 YAML 缺陷取证](./evidence/workload-yaml-validation-defect-20261025.json)和[DEV 修复记录](./workload-yaml-validation-dev-20261025.md)。

> **首次修复回归**：提交 `2676f00d054e11f6b8569e6f9b889e1cefbfba88` 的部署制品仍发送非法 YAML 字符串；证据见[首次修复回归](./evidence/workload-yaml-validation-regression-20261025.json)。

> **第二次 DEV 修复**：提交 `c8b0df35c` 对 `String` 对象先转为文本再解析，并要求解析结果为 Kubernetes 对象；新增 String 对象和标量文档回归测试。部署后确认详情页通用路径仍有缺陷，当前已退回 `DEV / 进行中`，待修复后重新验证非法 YAML 不产生 PUT。

> **详情页 YAML 修复**：已将 `packages/shared/src/hooks/useCommonActions/index.tsx` 改为严格解析，并捕获解析/API 异常显示保存失败提示；当前制品验证确认弹窗保持打开、显示保存失败且没有非法 PUT，三类合法 YAML 保存返回 200。此前的回归证据和当前通过证据保留在 YAML 证据文件中。详情 404 渲染缺陷见[详情 404 验证](./evidence/workload-detail-404-verify-20261025.json)。

> **上一个 VERIFY 结果**：`release-4.1.5` 对照发现的分区显示差异已完成 DEV 修复。提交 `4b363c688f1e784acb68fe32117756f03bb55bd2` 对应 CI、镜像、131 rollout 和 Pod imageID 已核对；已认证 Playwright 会话完成 Deployment、StatefulSet、DaemonSet 的分区点击验收，每次只显示当前分区。该结果仅作为退回 DEV 前的历史 VERIFY 证据，不能覆盖当前缺陷状态。证据见[分区切换验收](./evidence/workload-settings-tabs-verify-20261025.json)。

> **低权限增量（当前制品）**：已用临时 viewer 完成新的零 Cookie 登录和三类详情只读复验；编辑、更多操作、删除及配置引用写控件均隐藏或禁用。第二 namespace 项目路由返回页面未找到，完整跨 namespace UI 正反仍待 API 与缓存矩阵继续闭环。证据见[低权限浏览器复验](./evidence/workload-rbac-current-head-verify-20261025.json)。

> **Action 增量（当前制品）**：已复验三类详情 Action 菜单及资源专属入口；Deployment 自动扩缩/YAML、StatefulSet 编辑服务弹窗可打开并取消，DaemonSet 不显示不适用入口。仅关闭入口样本，成功/失败/冲突/网络/RBAC 路径继续留在 VERIFY 清单。证据见[Action 入口复验](./evidence/workload-action-surface-verify-20261025.json)。

> **namespace 隔离增量（当前制品）**：使用只绑定第一项目的 viewer 完成正反直达验证：第一 namespace 详情可读，第二 namespace 详情返回 `/errors/403`。第二 namespace 的临时资源、用户、绑定和 Workspace 标签已清理/恢复；列表缓存、刷新和返回组合继续留在 VERIFY。证据见[namespace 正反隔离复验](./evidence/workload-namespace-isolation-current-head-verify-20261025.json)。

> REA 主基线为 `release-4.1.5` 完整前端源码和同版本已部署页面 `192.168.2.131:30881`；同版本 `v3dist` 仅作发布制品校准；`origin/release-3.4` 仅作当前版本无法解释时的历史补充。未闭环的字段、Action、RBAC、缓存、错误和逐项等价性保留在 VERIFY 验收清单，不能标记为已验收。

> 本页下方旧日期段落保留为历史证据；最新阶段只以 `module-execution.json` 为准。

> **2026-10-24 批量删除复验**：在已有登录态下完成三类批量删除，StatefulSet 关联 Headless Service 同步清理，DaemonSet DELETE 200 OK；该结果来自此前精确制品，当前 31b6 制品的零 Cookie 登录仍失败，因此当前制品的登录门禁、完整错误/缓存和逐项 V3 等价仍未闭环。

> **2026-10-24 登录阻塞**：当前 31b6 制品已完成 131 部署和身份核对，但零 Cookie 新 context 的专用测试账号登录仍返回 `Incorrect username or password`，未进入本轮完整浏览器验证；此前批量删除修复制品的部署尝试已按规则回滚。登录失败原因尚未归因，不能将当前制品的批量删除、完整错误/缓存和逐项 V3 等价标记为通过。详见 [当前制品原生设置证据](./evidence/workload-native-settings-current-head-20261024.json)。

# 历史记录：批量删除修复已构建（后续已部署并因登录失败回滚）（2026-10-24）

批量删除参数修复已提交于 `9a5bd5cdc22ec7877c33773ca1ba8562a463bcd6`。本地 `./scripts/test.sh` 通过 91 个测试文件、402 项测试，`corepack yarn build:packages` 通过；CI Run `40042145365` 成功，精确制品为 `feature-v4-workloads-20261024-075502-9a5bd5cdc22e`，镜像 digest 为 `sha256:cb4e48ff69f11fe829586f5134c0de24831895a46f558f2fdf9f85a1a19861f0`。

该段记录形成时尚未将该新制品部署到 131；随后已完成一次精确部署，但因浏览器登录失败按规则回滚。StatefulSet 关联 Service、Deployment/StatefulSet/DaemonSet 批量删除成功路径仍未在可登录的新制品上复验；模块保持 `VERIFY / 未完成`。

> **2026-10-24 批量删除缺陷复核**：旧精确制品的真实浏览器批量删除发现 StatefulSet 关联 Headless Service 残留，根因是页面 Hook 丢弃 `annotations`。已补充最小修复和回归测试，Workload 阶段退回 `DEV`；新制品尚未完成构建、部署和浏览器复验，批量删除不能标记通过。详见 [批量删除缺陷取证](./evidence/workload-batch-delete-defect-20261024.json)。

> **2026-10-24 回退复验**：Deployment 专用 fixture 已在精确制品上完成回退目标选择、实际 PATCH 200、弹窗关闭和 rollout/Ready 恢复；证据见 [Deployment 回退浏览器复验](./evidence/workload-rollback-browser-verify-20261024.json)。批量删除、伸缩确认、完整错误/缓存和逐项 V3 等价仍未闭环，Workload 保持 `VERIFY / 未完成`。

> **2026-10-24 集群级列表复验**：精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 的 Deployment、StatefulSet、DaemonSet 集群级原生列表入口已在 131 完成零 Cookie 浏览器登录和渲染复验；专用 fixture、namespace 控件可见，页面错误为 0，未发现 `/consolev3` 或 `/dist/v3dist` 请求。批量删除确认后的成功结果仍未验证，状态继续为 `VERIFY / 未完成`。详见 [集群级列表证据](./evidence/workload-cluster-native-browser-verify-20261024.json)。

# V4 迁移矩阵

> **2026-10-25 编辑设置部署后复验：** 新制品已在 131 rollout 成功，Pod imageID 与 `sha256:1bbb4c4297e590d59ba117c18dc0b83f7e2fc6085439ff4549af87b81ab5ac71` 一致；已有认证 Playwright 会话确认 Deployment/StatefulSet 五分区、DaemonSet 四分区与 `release-4.1.5` 基线一致，基础字段和 `ADD_METADATA` 已不再出现在编辑设置弹窗。该证据只关闭本次 UI 边界差异，完整 Workload 验收仍为 `测试中`。详见 [`workload-settings-v415-verify-20261025.json`](./evidence/workload-settings-v415-verify-20261025.json)。
> **2026-10-25 配置引用复验：** 当前制品的 Deployment、StatefulSet、DaemonSet 配置引用页面和读取 API 已通过，Network 未观察到 `/consolev3`、`/dist/v3dist` 或 `workload.template.edit`；写入和错误路径仍未验收。详见 [`workload-config-reference-v415-verify-20261025.json`](./evidence/workload-config-reference-v415-verify-20261025.json)。
> **2026-10-25 低权限 API 复验：** 当前制品对应的测试用户在 `v4-migration-e2e` 对 Deployment/StatefulSet/DaemonSet 只读，在 `default` 三类资源均被拒绝；低权限浏览器页面和缓存切换仍未验收。详见 [`workload-rbac-api-v415-verify-20261025.json`](./evidence/workload-rbac-api-v415-verify-20261025.json)。
> **2026-10-25 当前制品 404 复验：** Deployment、StatefulSet、DaemonSet 直达不存在资源均显示统一 `/404` 页面；该项不扩大为完整错误矩阵通过。详见 [`workload-detail-404-v415-verify-20261025.json`](./evidence/workload-detail-404-v415-verify-20261025.json)。
> **2026-10-25 Action 入口复验：** 当前制品已确认 Deployment、StatefulSet、DaemonSet 的资源专属 Action 菜单边界；该结果只覆盖入口可见性，不关闭 Action 的写入和错误矩阵。详见 [`workload-action-surface-v415-verify-20261025.json`](./evidence/workload-action-surface-v415-verify-20261025.json)。
> **2026-10-25 编辑设置提交校验缺陷：** 当前制品在修改终止宽限期时因为隐藏副本数未参与提交前校验而阻止保存，API 资源未变化；该问题已退回 DEV，修复后需重新完成部署后浏览器验收。详见 [`workload-settings-validation-defect-20261025.json`](./evidence/workload-settings-validation-defect-20261025.json)。

> **2026-10-25 编辑设置基线对照：** 以 `release-4.1.5` 完整源码和同版本 131 页面为主基线，发现当前 V4 编辑设置多出基础字段和元数据分区。已按基线调整 `WorkloadSettingsModal`，并以初始值合并保护隐藏字段；当前阶段为 `VERIFY / 进行中`，新制品已完成部署后 Playwright 复验，三类 Workload 不标记为已验收。证据见 [`workload-settings-v415-diff-20261025.json`](./evidence/workload-settings-v415-diff-20261025.json)。

> **2026-10-24 制品边界校准**：源码提交 `ae500da86a55` 的首次部署曾因新 Pod 长时间处于 `ContainerCreating` 而回滚，后续源码提交 `31b6d88fc7e8` 的精确制品已完成 131 Ready、digest/imageID 核对及当前制品设置入口复验。旧精确制品与旧部署尝试仍只作为历史证据；当前 31b6 制品的完整字段、登录、RBAC、缓存、错误和逐项等价性仍未闭环。历史文档中“仍打开 YAML”的描述属于旧 REA 快照，已由[原生设置证据](./evidence/workload-native-settings-old-artifact-20261024.json)校准。

> **2026-10-24 当前制品设置复验**：源码提交 `31b6d88fc7e8`（之后仅有记录提交）已完成精确部署和 Pod imageID 核对；在已有认证态中三类详情的“编辑设置”均打开原生设置弹窗，未跳转 YAML，并完成终止宽限期 `30 → 31 → 30` 的保存与 API 回读。零 Cookie 新 context 登录仍返回账号或密码错误。该结果只关闭入口形态和一个字段保存场景，当前制品完整字段、RBAC、缓存、错误和逐项 V3 等价仍未闭环。详见[当前制品原生设置复验](./evidence/workload-native-settings-current-head-20261024.json)。

> **2026-10-24 Workload 当前 VERIFY 结果**：精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 已完成三类原生路由、配置引用、低权限拒绝、第二 namespace 正反隔离、Action 菜单/取消、重新创建和 DaemonSet 批量停止的浏览器复验。批量删除、伸缩确认结果、完整错误矩阵和逐项 V3 等价仍未闭环；Deployment 回退确认写入已完成独立复验，状态保持 `VERIFY / 未完成`，不得进入 PR 合并或标记模块已验收。详见 [131 VERIFY](./workload-131-verify-20261024.md)、[配置引用证据](./evidence/workload-config-reference-browser-verify-20261024.json)、[Action 证据](./evidence/workload-action-browser-verify-20261024.json)。

> 2026-10-24 当前进展：DEV 源提交 `3e1d40eae` 的 400 项本地回归通过；构建提交 `3d255eaf8` 的 CI Run 40000821377 和首次 131 rollout 成功。新 context 登录未通过后已回滚旧镜像；专用测试凭据在旧镜像也被拒绝，当前浏览器 VERIFY 阻塞。三类资源均未整体验收，旧 SHA 结果不继承。详见 [部署与回滚](./workload-131-verify-20261024.md#当前增量部署与登录阻塞0229-上海时间)。
> 检查日期：2026-10-24
>
> 迁移集成分支：`feature/v4-migration`
>
> 基线：`release-4.1.5` / `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`
> Workload 当前阶段 `DEV`，REA 已通过；当前制品发现编辑设置隐藏副本数导致提交校验失败，已退回 DEV 修复，三类资源均未整体验收。唯一当前状态见 [module-execution.json](./module-execution.json)，当前结果与未完成项见本页最新日期记录。

> 2026-10-24 DEV 增量：镜像凭据元数据选择、GPU、应用层协议已补；继续补上设置侧栏分区及容器二级编辑，局部确认只回写草稿，外层确认才调用 API。尚未部署/浏览器验收；环境引用回填/修改/删除/optional 和配置引用 RBAC 已补本地代码；key 下拉与资源选项作用域隔离已补，镜像搜索/选择/标签/详情已补本地实现和回归；全部增量的新镜像验证仍待完成。详见 [增量记录](./workload-settings-dev-20261023.md#设置分区与容器二级编辑2026-10-24dev-增量)。

> 2026-10-23 执行入口补强：接入 Git 阶段检查、中文提交标题和 PR 全量差异检查；32 项隔离 Git 回归通过。此结果仅覆盖工具，不改变下表的功能状态，不代表 Deployment 编辑设置或其他模块已验收。

> 2026-10-24 当前 VERIFY：精确源提交 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 已部署到 131；三类原生 Workload 路由在零 Cookie 浏览器中完成登录、直达/刷新/返回、namespace API 作用域和设置页面复验，Network 未发现 `/consolev3` 或 `/dist/v3dist`。当前只关闭共享启动层全局 V3 预加载缺口，三类资源仍未整体验收。详见 [当前 VERIFY 证据](./evidence/workload-v3-preload-verify-20261024.json)。

> 2026-10-24 低权限复验：viewer 账号在当前精确制品上可读三类配置引用，更新均返回 403 且资源未改变；`default` namespace 无 get 权限。第二 namespace fixture 已验证：viewer 对第二 namespace get/list 均拒绝，第一 namespace 列表不包含第二 namespace 资源；临时 Deployment 已清理、namespace 保留。详见 [低权限与 namespace 证据](./evidence/workload-rbac-namespace-verify-20261024.json)。

> 当前组合批次：`deployment-statefulset-daemonset`，包括 Deployment、StatefulSet、DaemonSet；公共实现共用，三类资源分别完成 REA 和 VERIFY。本轮代码与本地验证见 [DEV 记录](./workload-settings-dev-20261023.md)。详见[组合能力边界](./workload-kind-capability-matrix.md)。下表中的既有测试数量和 131 观察均保留原 SHA，不代表本组合批次已验收。Pod、Job、CronJob 留在后续批次。

本分支不维护 ConfigMap/Secret/ServiceAccount 等其他模块的最新状态；这些行保留为历史输入，应回到对应模块分支核对，不据此否定既有验收成果。

状态值为：`未开始`、`分析中`、`开发中`、`测试中`、`已验收`。只有附带部署后制品的 Playwright 证据，模块才能标记为 `已验收`。

2026-10-25 当前 VERIFY 增量：当前制品已完成集群级 Deployment 列表在 `v4-migration-e2e` 与 `dev-biz` 之间切换、切回和刷新后的管理员浏览器复验，列表没有跨 namespace 残留。该证据只覆盖 Deployment 列表管理员视角，低权限列表、StatefulSet/DaemonSet 列表、详情返回和完整缓存组合仍未闭环，三类 Workload 均保持 `测试中`。详见 [`workload-cluster-namespace-cache-verify-20261025.json`](./evidence/workload-cluster-namespace-cache-verify-20261025.json)。

同日已完成 Deployment 自动扩缩的一次真实保存、API 回读和页面回读，测试 HPA 随后删除；该项不关闭完整错误、冲突、权限和其他资源 Action 验证。详见 [`workload-hpa-save-readback-verify-20261025.json`](./evidence/workload-hpa-save-readback-verify-20261025.json)。

同日已完成 Deployment YAML 测试 annotation 的浏览器写入、页面回读和清除，Deployment 保持 1/1；StatefulSet/DaemonSet YAML 和异常路径仍待补。详见 [`workload-yaml-save-readback-verify-20261025.json`](./evidence/workload-yaml-save-readback-verify-20261025.json)。

StatefulSet 与 DaemonSet 的 YAML 测试字段写入、页面回读和清除也已完成，两个资源均保持 Ready；非法 YAML、冲突、权限和网络失败路径仍待补。详见 [`workload-yaml-resource-kinds-verify-20261025.json`](./evidence/workload-yaml-resource-kinds-verify-20261025.json)。

| 模块                             | V3 路由/入口                                                                                 | V3 操作                                                  | V4 对应代码                                                                                                                                                                                                                                                                                                     | 缺口                                                                                                                                                            | 证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 负责人/执行器 | 状态   | 测试链接                      | PR  |
| -------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ | ----------------------------- | --- |
| ConfigMap                        | `/:workspace/clusters/:cluster/projects/:namespace/configmaps`，原为 `ConsoleV3ResourceList` | 列表、创建、编辑、删除；详情历史/元数据/事件             | 项目列表已切换 `ListPage`/`configMapStore`；原生创建弹窗；`containers/ConfigMaps/Detail`、`components/ConfigHistory`、`components/ConfigReference`                                                                                                                                                              | 131 列表/详情和创建弹窗可访问；真实创建、编辑、删除和权限流程待补                                                                                               | [依赖清单](./dependency-inventory.md)、[实施计划](../superpowers/plans/2026-10-16-config-secrets-native-list.md)、[131 验收记录](./config-secrets-131-acceptance.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Codex         | 测试中 | `ConfigMaps/**/*.test.*`      |     |
| Secret                           | `.../secrets`，原为 `ConsoleV3ResourceList`                                                  | 列表、创建、编辑、删除；数据脱敏；历史/元数据/事件       | 项目列表已切换 `ListPage`/`secretStore`；原生创建弹窗；`containers/Secrets/Detail`、`components/ConfigHistory`、`components/ConfigReference`                                                                                                                                                                    | 131 列表/详情和创建弹窗可访问；真实创建、编辑、删除和权限流程待补                                                                                               | [依赖清单](./dependency-inventory.md)、[实施计划](../superpowers/plans/2026-10-16-config-secrets-native-list.md)、[131 验收记录](./config-secrets-131-acceptance.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Codex         | 测试中 | `Secrets/**/*.test.*`         |     |
| ServiceAccount                   | `.../serviceaccounts`，原项目列表和集群列表使用 V3 Embed                                     | 列表、创建、删除、详情、项目角色                         | 集群配置 `ServiceAccounts/` 原生 `ListPage`、创建弹窗和角色修改；项目列表/详情复用原生实现；ServiceAccount 数据详情复用现有原生组件                                                                                                                                                                             | 已移除项目和集群列表/项目详情的 V3 入口；131 已完成新制品部署和列表、详情、创建弹窗、路由及项目作用域浏览器验收；真实创建、编辑、删除、角色修改和权限流程待补   | [依赖清单](./dependency-inventory.md)、[131 部署记录](./service-account-131-acceptance.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Codex         | 测试中 | `ServiceAccounts/**/*.test.*` |     |
| Deployment                       | 原 V3 项目列表、集群列表、详情及设置 Action 已替换为 V4 路由和组件                           | 编辑、YAML、伸缩、回滚、重启、删除、配置引用、事件、监控 | 项目/集群原生列表、详情、创建和设置；多容器、初始化容器、探针、生命周期、安全上下文、宿主时区、Pod 模板注解、Pod 调度、创建节点选择、创建及已有资源顶层标签/注解、资源、环境变量、卷及挂载表单；详情配置引用使用原生页面                                                                                        | 旧精确镜像专项验证已记录；当前制品已完成分区、部分 Action、低权限详情、项目级隔离和管理员列表缓存样本；完整字段写回、低权限列表缓存、错误矩阵和逐项等价仍待验收 | [集群原生入口](./evidence/workload-cluster-native-entry-20261023.json)、[Deployment 证据](./deployment-v3-evidence.md)、[缺口矩阵](./deployment-gap-matrix.md)、[编辑设置 REA](./workload-settings-rea-20261022.md)、[能力清单](./deployment-settings-capability-matrix.md)、[编辑设置 VERIFY](./deployment-settings-verify-20261022.md)、[当前缓存复验](./evidence/workload-cluster-namespace-cache-verify-20261025.json)、[组合边界](./workload-kind-capability-matrix.md)、[字段级对照](./workload-v3-field-equivalence-20261023.md)、[Action/API/权限与缓存证据](./workload-action-api-rbac-evidence-20261023.md)、[测试设计](./workload-test-design-20261023.md)                                                                                         | Codex         | 测试中 | VERIFY 进行中                 | #2  |
| StatefulSet                      | 原 V3 项目列表、集群列表和详情已替换为 V4 路由和组件                                         | 编辑、YAML、伸缩、重启、删除、配置引用                   | 项目/集群原生列表、详情、创建和 Workload Store 公共操作；创建同时生成 StatefulSet 与 Headless Service，支持 Service 端口、partition/OnDelete、PVC 模板、调度和元数据；设置保留优雅终止、安全上下文、宿主时区、模板注解、顶层元数据和 PVC 模板编辑；详情保留 Headless Service 原生编辑入口，配置引用使用原生页面 | 旧精确镜像专项验证已记录；当前制品已完成分区、Service 入口、低权限详情和项目级隔离；列表缓存、完整字段写回、错误矩阵和逐项等价仍待验收                          | [集群原生入口](./evidence/workload-cluster-native-entry-20261023.json)、[依赖清单](./dependency-inventory.md)、[创建 API dry-run](./evidence/workload-statefulset-create-20261023-api-validation.json)、[PVC 模板 API dry-run](./evidence/workload-pvc-template-20261023-api-validation.json)、[Service API dry-run](./evidence/workload-service-20261023-api-validation.json)、[当前缓存复验](./evidence/workload-cluster-namespace-cache-verify-20261025.json)、[组合边界](./workload-kind-capability-matrix.md)、[字段级对照](./workload-v3-field-equivalence-20261023.md)、[Action/API/权限与缓存证据](./workload-action-api-rbac-evidence-20261023.md)、[运行时 REA](./workload-runtime-rea-20261023.md)、[测试设计](./workload-test-design-20261023.md) | Codex         | 测试中 | VERIFY 进行中                 | #2  |
| DaemonSet                        | 原 V3 项目列表、集群列表和详情已替换为 V4 路由和组件                                         | 编辑、YAML、重启、删除、配置引用                         | 项目/集群原生列表、详情、创建、现有 Workload Store 和公共操作；创建不写入副本数并支持 DaemonSet 更新策略、就绪时间和优雅终止；设置已接安全上下文、宿主时区、模板注解和顶层元数据，且原样保留旧 UI 未建模的 affinity；详情配置引用使用原生页面                                                                   | 旧精确镜像专项验证已记录；当前制品已完成分区、停止恢复、低权限详情和项目级隔离；列表缓存、完整字段写回、错误矩阵和逐项等价仍待验收                              | [集群原生入口](./evidence/workload-cluster-native-entry-20261023.json)、[依赖清单](./dependency-inventory.md)、[创建 API dry-run](./evidence/workload-daemonset-create-20261023-api-validation.json)、[131 VERIFY](./workload-131-verify-20261022.md)、[当前缓存复验](./evidence/workload-cluster-namespace-cache-verify-20261025.json)、[组合边界](./workload-kind-capability-matrix.md)、[字段级对照](./workload-v3-field-equivalence-20261023.md)、[Action/API/权限与缓存证据](./workload-action-api-rbac-evidence-20261023.md)、[运行时 REA](./workload-runtime-rea-20261023.md)、[测试设计](./workload-test-design-20261023.md)                                                                                                                          | Codex         | 测试中 | VERIFY 进行中                 | #2  |
| Pod                              | 项目列表/详情使用 V3 桥接                                                                    | 状态、日志、终端、删除和容器导航                         | `containers/Pods/` 及集群工作负载源码                                                                                                                                                                                                                                                                           | V3 列表/详情、终端和日志生命周期需要原生等价实现                                                                                                                | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| Service / Ingress                | 项目和集群路由含 V3 Embed                                                                    | 创建/编辑/删除、端点、端口和路由                         | `containers/Services/`、`containers/Routes/`                                                                                                                                                                                                                                                                    | 项目和集群 Embed 仍在；API 和操作等价性待验证                                                                                                                   | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| Job / CronJob                    | 项目和集群路由含 V3 Embed                                                                    | 触发/重跑、暂停、历史、删除                              | `containers/Jobs/`、`containers/CronJobs/`                                                                                                                                                                                                                                                                      | V3 列表、集群 Embed 和执行流程需要等价验证                                                                                                                      | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| 存储 / 快照                      | 项目和集群路由含 V3 Embed                                                                    | PVC/PV、快照和快照内容操作                               | `containers/Volumes/`、`containers/VolumeSnapshots/`                                                                                                                                                                                                                                                            | 多个集群和项目 Embed 仍在                                                                                                                                       | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| 网络 / 告警 / 监控               | 集群和项目范围存在 V3 Embed 和 V3 Action                                                     | 策略、告警、自定义监控                                   | `containers/Network/`、`containers/Alerting/`、监控页面                                                                                                                                                                                                                                                         | 范围、操作和可视化等价性待验证                                                                                                                                  | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| 联邦                             | 联邦项目页面主要使用 Wujie Embed                                                             | 跨集群资源查看和操作                                     | `pages/fedprojects/`                                                                                                                                                                                                                                                                                            | 尚未映射原生替代方案；RBAC 和数据隔离需单独计划                                                                                                                 | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |
| 扩展 / 平台 / DevOps / Telemetry | 公共扩展 Embed，以及平台和模块 Embed                                                         | 扩展路由、平台配置、DevOps 和 Telemetry 流程             | 现有扩展和平台源码                                                                                                                                                                                                                                                                                              | 当前启用扩展清单及 V4 契约未完成                                                                                                                                | [依赖清单](./dependency-inventory.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Codex         | 未开始 |                               |     |

## P0 历史盘点（勾选不代表当前模块 REA 放行）

- [x] 从 `release-4.1.5` 的 `fc1253cbe` 创建 `feature/v4-migration`。
- [x] 完成 V3/Wujie 静态依赖清单。
- [x] 创建 Deployment 路由、API、Store、操作和缺口文档。
- [x] 启动 ConfigMap/Secret 项目列表原生化，并完成本地回归测试。
- [ ] 根据 131 部署版本映射所有启用路由和扩展。
- [x] ConfigMap/Secret 列表、详情和创建弹窗通过原生浏览器验收（真实提交及后续操作待补）。
- [ ] 每一行都有负责人、测试证据和 PR 后，才能标记为 `已验收`。

## 重新评估历史快照（2026-10-16，不作为当前状态）

本次按 `console-v4-migration-plan.md` 逐项核对后的结论如下：

| 计划项                | 当前结论       | 依据和未完成项                                                                                                                                              |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布基线              | 已完成         | `v4.1.5` 与 `release-4.1.5` 均指向 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`；`feature/config-history` 末提交 `2656419bc` 已在基线历史中，分支引用已删除。 |
| 迁移集成分支          | 已完成         | `feature/v4-migration` 已在本地和 `origin` 存在；文档提交以该分支当前 HEAD 和 Git 历史为准。                                                                |
| 模块短期分支 / PR     | 进行中         | `feature/v4-configmaps-secrets` / Draft PR #1 与 `feature/v4-workloads` / Draft PR #2 均已存在；其他模块只在对应模块开工时从最新迁移集成分支创建。          |
| P0 静态盘点           | 部分完成       | 依赖清单、Deployment 证据和缺口矩阵已生成；WSL REA 验证、131 全启用路由/扩展映射、V3 Action 完整实测和每行 PR 证据仍未完成。                                |
| P1 公共底座           | 未形成完成证据 | 复用了现有 `ListPage`、`DataTable` 和 Store，但 cluster/workspace/project 作用域、缓存隔离、权限和返回恢复的统一验收尚未完成。                              |
| P2 ConfigMap / Secret | 测试中         | 列表、详情和创建弹窗已完成 131 浏览器验证；真实创建、编辑、删除、批量删除、权限和完整作用域回归待补。                                                       |
| P2 ServiceAccount     | 测试中         | 项目/集群列表、详情、创建弹窗、路由和项目 namespace 作用域已完成 131 浏览器验证；真实创建、编辑、删除、角色修改和 RBAC 待补。                               |
| M1 Deployment         | 测试中         | Workload 组合批次 REA 与 DEV 已完成；当前 SHA 镜像、131 rollout、Playwright、RBAC、namespace、缓存及功能等价性进入 VERIFY。                                 |
| M2 ConfigMap + Secret | 未完成         | 真实操作和权限回归尚未完成，不能标记为 `已验收`。                                                                                                           |
| P3-P8 / release-4.2.0 | 未开始         | 后续资源迁移、V3/Wujie 清理和 `release-4.2.0` 创建均未达到前置条件。                                                                                        |

历史顺序冲突记录：2026-10-16 时第 4.2/12 节曾存在试点顺序冲突；主计划现已明确模块级门禁与当前顺序，该历史冲突不再作为当前开发阻塞。

2026-10-23 DEV 增量 `da25187d3`：三类原生设置的生命周期表单、校验与写回已补齐；73 文件/314 项回归、包构建、相关 ESLint 通过，131 三类 API dry-run 接受，普通 init 反例拒绝。未部署或执行新 SHA 浏览器验收；安全/调度/元数据等完整设置和其余清单继续保留。详见 [DEV 增量](./workload-settings-dev-20261023.md#生命周期原生编辑增量2026-10-23)。

2026-10-23 DEV 增量 `4f2b5fac9`：按当前制品工厂 2306 补齐三类资源的 Pod 模板注解编辑及 Deployment 创建，保留隐藏注解和模板 labels；75 文件/328 项回归、包构建和三类 API server dry-run 通过。未部署当前 SHA；workload 顶层 labels/annotations、调度及其余 DEV 清单仍未关闭。详见 [DEV 增量](./workload-settings-dev-20261023.md#pod-模板注解原生编辑增量2026-10-23)。

2026-10-23 DEV 增量 `7db1a9353`：按当前制品工厂 1530/2440/2583 补齐 Deployment/StatefulSet 的默认、分散、聚合和自定义 Pod 调度，Deployment 创建补齐节点选择器；无法安全建模的既有 affinity 显式保留，DaemonSet 保留原配置且不显示旧 V3 没有的调度区。77 文件/336 项回归、包构建、类型基线对照和三类 API server dry-run 通过。未部署当前 SHA，仍处于 DEV。详见 [DEV 增量](./workload-settings-dev-20261023.md#pod-调度与节点选择增量2026-10-23)。

2026-10-23 DEV 增量 `86ce8b4ab`：按当前制品工厂 2439 与 main 工厂 52 补齐 Deployment 创建的 workload 顶层 labels/annotations；标签同步写入资源、selector 和 Pod 模板，系统 app/别名/描述保持优先，并在同 cluster/namespace 调用已有标签重复检查。精确提交 77 文件/340 项回归、包构建、类型基线对照和 131 API server dry-run 通过。StatefulSet/DaemonSet 创建、已有资源顶层元数据编辑及其他 DEV 清单未完成，未部署当前 SHA，阶段保持 DEV。详见 [DEV 增量](./workload-settings-dev-20261023.md#deployment-创建顶层元数据增量2026-10-23)。

2026-10-23 DEV 增量 `da741a389`：按当前制品工厂 933/2285 补齐普通容器和初始化容器的“同步宿主机时区”开关；任一容器启用时维护只读 `/etc/localtime` 挂载与 `host-time` HostPath 卷，全部关闭时删除对应系统卷，其他卷保持不变。精确提交 77 文件/343 项回归、包构建、类型基线对照和三类 131 API server dry-run 通过。未部署当前 SHA，实际 Pod 时区与浏览器行为留待 VERIFY，阶段保持 DEV。详见 [DEV 增量](./workload-settings-dev-20261023.md#宿主时区同步增量2026-10-23)。

2026-10-23 DEV 增量 `da741a389`：修复 DaemonSet 停止仍写入无效 `spec.replicas=0` 的缺陷，按当前制品工厂 318 改为 `spec.template.spec.nodeSelector.non-existing=true`；Deployment/StatefulSet 保持副本归零。77 文件/344 项回归、包构建、类型基线和 131 DaemonSet server dry-run 通过，资源版本与实际 nodeSelector 未变化。真实停止/恢复留待 VERIFY。

2026-10-23 DEV 增量 `35ca7fb79`：项目级 DaemonSet 列表接入原生创建，按资源类型复用创建表单，不写入副本数，并支持更新策略、就绪时间、优雅终止、成功刷新和本地化失败反馈。精确提交 78 文件/342 项回归、相关静态检查、包构建和 131 API server dry-run 已执行；完整 TypeScript 仍受 147 条既有 `type-fest` 解析诊断影响。未构建或部署当前 SHA 镜像，真实持久化、RBAC、namespace、缓存和浏览器等价性留待 VERIFY。详见 [DEV 增量](./workload-settings-dev-20261023.md#daemonset-原生创建2026-10-23)。

2026-10-23 DEV 增量 `6328e67aa`：项目级 StatefulSet 列表接入原生双资源创建，原生表单生成 StatefulSet 和配套 Headless Service，支持 Service 端口、partition/OnDelete、PVC 模板、调度、元数据、成功刷新与本地化失败反馈；Store 在实际提交前先完成两项服务端 dry-run。精确提交 79 文件/352 项回归、定向静态检查、包构建和 131 双资源 API server dry-run 已执行；全项目 TypeScript 仍有 1316 条既有诊断，本次 console 生产文件直接诊断为 0。未构建或部署当前 SHA 镜像，真实持久化、双 POST 部分成功恢复、RBAC、namespace、缓存和浏览器等价性留待 VERIFY。详见 [DEV 增量](./workload-settings-dev-20261023.md#statefulset-原生创建2026-10-23)。

2026-10-23 DEV 增量 `d762c005b`：集群级 Deployment、StatefulSet、DaemonSet 三个主路由从 Wujie/V3 Embed 切换到原生列表，复用三类原生创建并支持在弹窗选择 namespace；空 namespace 不加载配置/PVC/调度依赖，异常状态改为原生 `StatusReason`。精确提交 80 文件/358 项回归、定向静态检查、包构建和 14 项可复现源码校验通过；全项目 TypeScript 仍有 1316 条既有诊断，本次生产文件直接诊断为 0。未构建或部署当前 SHA 镜像，集群页面渲染、动作、RBAC、namespace、缓存和 V3 等价性留待 VERIFY。详见 [DEV 增量](./workload-settings-dev-20261023.md#集群级三类原生入口2026-10-23)。

2026-10-23 VERIFY 缺陷：精确镜像 `feature-v4-workloads-20261023-165354-c721dce0491e` 上，StatefulSet 单项删除及配套 Service 清理通过；浏览器批量删除两个专用 StatefulSet 后两个 Headless Service 仍存在。页面实际调用的 `useBatchDeleteWorkloadMutation` 未复用 `batchDelete` 清理路径，模块已按状态机退回 DEV，修复并重新部署前不得标记 VERIFY 通过。

2026-10-23 DEV 修复 `7287c6b82`：页面实际使用的 `useBatchDeleteWorkloadMutation` 已统一复用 `batchDelete`，关闭 StatefulSet 批量删除遗留 Headless Service 以及关联 HPA 绕过清理的问题。新增 Hook 回归修复前 26/27、修复后 27/27；完整回归 81 文件/364 项、包构建和变更文件检查通过。当前阶段重新进入 VERIFY，必须以新 SHA 镜像重验。

2026-10-23 VERIFY 缺陷：精确镜像 `feature-v4-workloads-20261023-173504-740e05d675f8` 已通过 StatefulSet 批量删除及配套 Service 清理；Deployment 批量删除关联 HPA 的浏览器请求包含 `/clusters/undefined/` 并返回 400。根因是 `batchDelete` 调用 `deleteHpa` 时遗漏 `cluster`，模块再次退回 DEV。

2026-10-23 DEV 修复 `cdc245c0d`：关联 HPA 删除现已传递 workload 的 cluster/namespace/name 完整作用域；回归用例同步断言完整作用域。定向测试 27/27、完整回归 81 文件/364 项、包构建、ESLint、Prettier 和差异检查通过，模块重新进入 VERIFY，必须以该 SHA 镜像重验浏览器批量删除和 HPA 清理。

2026-10-23 VERIFY 结果与缺陷：精确镜像 `feature-v4-workloads-20261023-180140-7fa49aa192d0` 上，Deployment 批量删除关联 HPA 的完整 cluster 作用域和四个 200 响应通过；DaemonSet 停止、原节点选择保留及恢复通过；StatefulSet 原生创建页已持久化 PVC 模板、挂载并生成 Bound PVC。浏览器同时稳定复现 PVC 区标题、添加按钮和校验键未翻译，模块退回 DEV 修复本地化后再验证页面渲染。
2026-10-23 DEV 修复 `f6b7c689b`：StatefulSet 创建页改用现有 PVC 标题和添加按钮本地化键，并补齐中、英、西、繁四种语言的无效/重复模板校验文案。新增源码约束测试先红后绿；完整回归 81 文件/364 项、packages/locales 构建、ESLint、Prettier 与 `git diff --check` 通过。模块重新进入 VERIFY，等待该 SHA 精确镜像的页面渲染重验。

## 当前增量（2026-10-24：StatefulSet/DaemonSet 详情页 REA 对照）

- 当前文档提交以 `feature/v4-workloads` 实际 HEAD 为准；本轮新增证据见 [`StatefulSet/DaemonSet 详情页浏览器对照`](./evidence/workload-kind-detail-browser-20261024.json)。
- 真实浏览器已打开两个 StatefulSet 和两个 DaemonSet 的基线 `30881`、V4 `30880` 详情页；四个资源的两套详情路由均返回 200，页面均渲染资源状态和 `1/1` Pod。
- StatefulSet 两边均显示编辑服务、编辑设置、YAML、重新创建、删除等入口；DaemonSet 两边均显示编辑设置、YAML、重新创建、删除。当前 V4 三类详情页增加原生“配置引用”Tab。
- 本轮只完成入口、Tab、页面渲染和部分读请求证据，没有执行写操作；Service/PVC、停止恢复、RBAC、缓存、错误路径和完整 V3 等价继续保持未验证。模块仍为 `REA / 分析中，待复核`，不进入 DEV。

## 当前增量（2026-10-24：编辑设置 Modal 样式与分区对照）

- 在同一 StatefulSet `v4-pvc-sts-7fa` 上，基线 `30881` 和当前 V4 `30880` 均可打开“编辑设置”。基线按分区切换单一内容，当前 V4 使用连续可滚动原生表单；两边的分区命名和首屏字段范围存在差异。
- 该差异已记录为 REA 的功能与样式审查项：必须继续逐项确认字段、默认值、校验、清空/保留和保存回读，再决定是否需要 DEV 调整布局或交互。详情见 [`编辑设置 Modal 对照`](./evidence/workload-settings-modal-browser-20261024.json)。
- 本轮没有写操作，不能标记编辑设置等价通过；模块仍为 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Deployment 编辑设置 Modal 对照）

- `Deployment/v4-deploy-edit-ef3` 在基线 `30881` 和当前 V4 `30880` 均可打开编辑设置。基线按分区切换，V4 使用连续可滚动原生表单；两边均有更新策略 `25%/25%`，但首屏字段范围和分区命名不同。
- 当前 V4 页面展示了完整的 `kubectl.kubernetes.io/last-applied-configuration` 注解文本，该展示规则需要负责人确认后纳入验收标准；当前不直接判定为缺陷。
- 证据见 [`Deployment 编辑设置浏览器对照`](./evidence/workload-deployment-settings-browser-20261024.json)。本轮没有写操作，保存回读、错误路径、缓存和 RBAC 仍未完成。模块继续保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Workload 静态 REA 测试）

- 当前源码相关的 6 个 Workload 测试文件共 85 项全部通过，覆盖资源类型字段分支、更新策略、PVC 模板、元数据、调度、安全上下文、镜像凭据、环境引用和原生详情入口。
- 该结果只证明当前源码静态逻辑通过，不能替代 131 部署制品上的浏览器、API 写回、RBAC、缓存和完整 V3 等价验证。证据见 [`Workload 静态 REA 测试`](./evidence/workload-static-rea-tests-20261024.json)。模块仍为 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：配置引用原生页面 REA）

- 当前 V4 的 Deployment、StatefulSet、DaemonSet 配置引用路由均已通过真实浏览器打开，HTTP 200，ConfigMap/Secret 引用名称和生成环境变量摘要正常渲染。
- 页面明确不展示 Secret 值；读取请求绑定 `host/v4-migration-e2e`，ConfigMap 列表、Secret 列表和引用 ConfigMap 读取返回 200。
- 本轮没有应用写回，不能关闭 prefix、多容器、文件挂载、Reloader、RBAC、缓存和错误路径。`release-4.1.5` 基线没有同名原生 Tab，旧 V3 等价需要单独映射。证据见 [`配置引用原生页面 REA`](./evidence/workload-config-reference-rea-browser-20261024.json)。模块仍为 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Deployment 元数据页对照）

- 基线与当前 V4 的 Deployment 元数据页均显示相同标签和两个关键注解，包括 `kubectl.kubernetes.io/last-applied-configuration`。
- 当前 V4 编辑设置首屏展示该注解，基线编辑设置首屏不展示，但基线元数据 Tab 同样展示；该项从“元数据来源差异”调整为“Modal 信息组织差异”。
- 仍需验证编辑设置中的字段清空、保留、非法值和保存回读。证据见 [`Deployment 元数据页对照`](./evidence/workload-metadata-browser-20261024.json)。模块继续保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：配置引用查看摘要）

- Deployment 配置引用页的“查看”只显示 ConfigMap 键名 `APP_MODE` 和 Secret 键名 `TOKEN`，不显示 Secret 值，没有产生写请求。
- 该结果补充了脱敏和摘要渲染证据，但不等同于应用引用保存通过。证据见 [`配置引用 REA 浏览器记录`](./evidence/workload-config-reference-rea-browser-20261024.json)。

## 当前增量（2026-10-24：配置引用静态测试）

- 当前 HEAD `ca18a3958437bea6357de57abcc04af9fff6d4d0` 上，ConfigReference 目录 11 个现有测试文件共 75 项全部通过。
- 测试覆盖引用解析、前缀和键名预览、环境变量摘要、文件挂载双层写回、Reloader 注解、原生编辑提交防重复、错误重试和原生路由约束。
- 该结果仅作为 REA 静态输入，不能替代当前分支制品的浏览器写回、API 回读、RBAC、namespace 缓存、错误路径和完整 V3 等价验证。证据见 [`evidence/workload-config-reference-static-tests-20261024.json`](./evidence/workload-config-reference-static-tests-20261024.json)，模块继续保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Workload 定向静态测试）

- 当前 HEAD `1b505477e96cab4999065ce63683f0f3c69a7223` 上，Workload 相关目录筛选出的 34 个现有测试文件共 211 项全部通过。
- 覆盖配置引用、设置表单、资源类型字段分支、三类资源原生详情入口和 Action 静态行为。
- 该结果只作为 REA 静态输入，不能替代当前 SHA 的构建、部署、浏览器写回、RBAC、namespace 缓存隔离、错误路径和完整 V3 等价验证。证据见 [`evidence/workload-rea-targeted-tests-20261024.json`](./evidence/workload-rea-targeted-tests-20261024.json)，模块继续保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Action/API 静态记录纠偏）

- 已修正旧静态证据中关于 StatefulSet/DaemonSet 编辑设置仍调用 YAML 的过时描述；当前三个项目级详情页均打开原生 `WorkloadSettingsModal`，YAML 是独立 Action。
- 已修正配置引用桥接描述：当前 ConfigReference 生产入口的静态测试未发现 `useV3action`、Wujie 或 `consolev3` 调用；集群级三类 Workload 主路由也已由静态测试确认使用原生列表。当前源码的全局 `preloadApp()` 已移除，但部署后 Network 复验尚未绑定当前 HEAD；其他集群级 Embed 入口仍单独保留为未关闭项。
- 该纠偏只更新证据口径，不关闭运行时字段、API、RBAC、缓存、错误和完整 V3 等价风险。模块继续保持 `REA / 分析中，待复核`。

## 历史尝试（2026-10-24：131 登录边界核对）

- 只读核对确认 context `default`、API Server `192.168.2.131:6443`、V4 NodePort `30880` 和 `release-4.1.5` 对比 NodePort `30881` 均可达，两个前端 Deployment 均 `1/1 Ready`。
- 浏览器登录读取 `/home/bruce/.bashrc` 中的 `KS_TEST_USERNAME`、`KS_TEST_PASSWORD`；原尝试只继承子进程环境，未把未 export 的用户名传入浏览器，登录返回 `Incorrect username or password`。
- 本记录没有进入 Workload 页面，没有写请求；不能将该次失败归因于前端功能或账号无效。原始证据见 [`workload-browser-login-rea-20261024.json`](./evidence/workload-browser-login-rea-20261024.json)。

## 当前增量（2026-10-24：131 登录环境变量继承补正）

- 复核确认 `/home/bruce/.bashrc` 中 `KS_TEST_USERNAME` 已赋值但未 `export`，`KS_TEST_PASSWORD` 已导出；在浏览器启动前显式导出已有 shell 变量后，新浏览器上下文成功从 `/login` 进入 V4 `/dashboard`，显示 `platform-admin`。
- 本次使用 131 当前已部署制品源提交 `31b6d88fc7e87707776c094aee12f1cdcb02604b`、镜像 digest `sha256:2956710cd7ef2fbda79ff7a0a9695dac466336bd08248784d5afdfb577b951d3`，仅验证登录链路，没有执行资源写操作。该结果不能替代当前 HEAD 的构建、部署和 Workload 浏览器验收。
- 登录阻塞已解除；模块仍保持 `REA / 分析中，待复核`。证据见 [`workload-browser-login-exported-shell-20261024.json`](./evidence/workload-browser-login-exported-shell-20261024.json)。

## 当前增量（2026-10-24：Workload 原生列表浏览器 REA）

- 在已认证浏览器中直达 `test-workspace / host / v4-migration-e2e` 的 Deployment、StatefulSet、DaemonSet 项目列表，三类页面均成功渲染，每类显示 2 条专用资源；类型切换、搜索、刷新、定制内容、创建入口和分页控件可见。
- 三类列表 API 均返回 200，路径包含 `namespaces/v4-migration-e2e`，本轮没有执行创建、编辑、删除或其他写操作。证据见 [`workload-native-list-browser-rea-20261024.json`](./evidence/workload-native-list-browser-rea-20261024.json)。
- 页面仍记录已知扩展初始化错误和 Wujie 警告；未观察到 Workload 列表自身错误。该扩展问题独立跟踪，不能作为当前 Workload 原生列表通过的替代条件。当前证据来自源提交 `31b6d88fc7e87707776c094aee12f1cdcb02604b` 的已部署制品，当前 HEAD 仍需负责人复核后重新部署验证，模块保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：Workload 原生详情浏览器 REA）

- 三类专用资源详情页均可直达并渲染：Deployment `v4-deploy-edit-ef3`、StatefulSet `v4-pvc-sts-7fa`、DaemonSet `v4-stop-ds-7fa`；详情 Tab 包含资源状态、元数据、环境变量、配置引用和事件等入口。
- Deployment 的“更多操作”包含回退、自动扩缩、编辑设置、编辑 YAML、重新创建和删除；只读打开“编辑设置”后观察到更新策略、容器组设置、存储、调度、终止宽限和元数据分区，取消关闭且没有写请求。证据见 [`workload-native-detail-browser-rea-20261024.json`](./evidence/workload-native-detail-browser-rea-20261024.json)。
- 本证据来自源提交 `31b6d88fc7e87707776c094aee12f1cdcb02604b` 的已部署制品，不能替代当前 HEAD 的构建部署和 VERIFY；保存回读、全部 Action、RBAC、缓存、错误路径和完整 V3 等价仍未关闭，模块保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：当前 HEAD 静态 REA 测试重跑）

- 当前 HEAD `d7cf426843f928e8a4458784d4800f862877477e` 上重新执行 34 个 Workload 定向测试文件，共 211/211 通过；集群级 Deployment、StatefulSet、DaemonSet 原生入口测试 6/6 通过。
- 本轮只执行源码测试，没有修改业务代码、构建或部署；证据已重新绑定当前 HEAD，仍不能替代当前 SHA 的部署后浏览器、API 写回、RBAC、缓存、错误和完整 V3 等价验证。模块继续保持 `REA / 分析中，待复核`。

## 当前增量（2026-10-24：集群级原生入口静态测试）

- 当前 HEAD `d78cab185f66beaebe16c03c3b3a09518c748cc8` 上执行 `nativeWorkloads.test.ts`，6 项全部通过。
- 已验证集群级 Deployment、StatefulSet、DaemonSet 主路由引用原生 Workload 列表，保留 namespace 选择，并按所选 namespace 调用对应创建 Store。
- 该结果只关闭集群级三类 Workload 主路由的静态未知项；当前源码 `wujie.ts` 已无 `preloadApp()` 调用，但当前 HEAD 尚未完成本轮部署后的 Network 复验；其他集群级 Embed、当前制品浏览器、RBAC、缓存、错误和逐项 V3 等价仍未验证。证据见 [`workload-cluster-native-static-tests-20261024.json`](./evidence/workload-cluster-native-static-tests-20261024.json)，模块继续保持 `REA / 分析中，待复核`。

## 2026-10-24 当前 HEAD 重跑定向测试

在当前 HEAD `8d561743f22586f23ff75f70a2fad43f8c33e42a` 上重新执行 34 个 Workload 定向测试文件，共 211/211 通过；另外执行集群级三类 Workload 原生入口测试，共 6/6 通过。此次重跑没有修改业务代码、没有构建、没有部署，仅更新证据绑定到当前 HEAD。

证据见 [`Workload 定向静态测试`](./evidence/workload-rea-targeted-tests-20261024.json) 和 [`集群级原生入口静态测试`](./evidence/workload-cluster-native-static-tests-20261024.json)。这些结果仍不能替代当前制品浏览器、RBAC、缓存、错误和逐项 V3 等价验证；模块保持 `REA / 分析中，待复核`。
