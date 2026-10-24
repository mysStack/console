# Workload 当前制品 VERIFY 记录（2026-10-24，最新增量 2026-10-25）

> **最新增量优先**：2026-10-25 已对提交 `4b363c688f1e784acb68fe32117756f03bb55bd2` 对应制品完成重新构建、部署和 Playwright 验收。分区切换证据见 [`workload-settings-tabs-verify-20261025.json`](./evidence/workload-settings-tabs-verify-20261025.json)。本文更早章节中的旧 SHA、旧镜像和旧布局观察只保留为历史记录，不能覆盖最新增量结论。

## 2026-10-25 集群级 namespace 切换与刷新缓存复验

在当前 131 制品的集群级 Deployment 列表中，使用已认证管理员会话依次选择 `v4-migration-e2e`、`dev-biz`、再切回 `v4-migration-e2e`，列表分别只显示当前 namespace 的资源：第一 namespace 显示 `v4-deploy-edit-ef3`、`v4-watch-20261022-02` 两条，`dev-biz` 显示五条业务 Deployment，切回后恢复为前两条。对 `v4-migration-e2e` 点击刷新后仍保持两条当前 namespace 资源，没有观察到前一 namespace 的列表残留。结构化证据见 [`workload-cluster-namespace-cache-verify-20261025.json`](./evidence/workload-cluster-namespace-cache-verify-20261025.json)。

本轮关闭了管理员列表视角下的 namespace 切换与刷新样本，不能替代低权限账号、StatefulSet/DaemonSet 列表、详情页返回和完整用户/namespace 缓存组合验证；模块继续保持 `VERIFY / 进行中`。

## 2026-10-25 当前 SHA 分区切换 VERIFY

| 项目        | 结果                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| 分支 / 提交 | `feature/v4-workloads` / `4b363c688f1e784acb68fe32117756f03bb55bd2`                                   |
| CI          | Run `40127350345`；Unit tests、Build and publish ks-console 均成功                                    |
| 镜像        | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261025-035514-4b363c688f1e`                       |
| 镜像 digest | `sha256:143572eea79151a40036f0d371f847346acdf39e592c584fd8a37ff6e39ac392`                             |
| 131 rollout | `kubesphere-system/ks-console` 成功，Deployment generation `604`，副本 `1/1` Ready                    |
| Pod imageID | `ghcr.io/mysstack/ks-console@sha256:143572eea79151a40036f0d371f847346acdf39e592c584fd8a37ff6e39ac392` |
| Playwright  | 使用已有认证会话验证三类资源的分区切换和取消路径                                                      |

本轮在当前 30880 制品上验证：Deployment 的 6 个分区、StatefulSet 的 6 个分区、DaemonSet 的 5 个分区均可点击切换；每次只有当前 `tabpanel` 可见，其余分区隐藏。三个资源的编辑设置弹窗宽度均为 `1162px`。StatefulSet 的副本分组序号和 PVC 模板、DaemonSet 的最大不可用容器组数量和最短就绪运行时长均保持可见。未提交资源修改，只使用“取消”关闭弹窗。

本轮从 `/home/bruce/.bashrc` 加载测试账号环境变量并尝试新的零 Cookie 登录，页面返回通用登录失败提示，未进入 Console；账号信息未写入证据。分区验收继续使用已有认证会话。页面仍有已登记的扩展初始化错误，因此不记录为控制台零错误。低权限浏览器正反、缓存失效、完整字段和逐项 V3 功能等价、错误/取消完整矩阵仍未关闭。Workload 继续保持 `VERIFY / 进行中`，不进入 PR 验收。

## 2026-10-25 当前 SHA 低权限浏览器复验

本轮在当前 4b363c688f1e 制品上创建临时低权限用户，绑定 `test-workspace` 的 `test-workspace-viewer` 和 `v4-migration-e2e` 的项目 `viewer` 角色。新零 Cookie Playwright 会话登录成功，进入三个 Workload 详情页后均只能读取资源，编辑信息、更多操作、编辑设置和删除入口均未显示。配置引用页可以读取，添加引用、引用选择、删除和应用控件均为禁用，Secret 值没有展示。

第二 namespace 的项目路由返回“页面未找到”，本轮不把它单独认定为完整的第二 namespace UI 正反隔离通过，继续引用已有 Kubernetes API 隔离证据。临时用户及其 WorkspaceRoleBinding、项目 RoleBinding 已清理。结构化证据见 [`workload-rbac-current-head-verify-20261025.json`](./evidence/workload-rbac-current-head-verify-20261025.json)。本轮关闭了当前 SHA 的低权限登录、三类详情只读和配置引用控件可见性样本，完整 403/404/409/422、缓存切换和逐项 V3 等价仍未关闭。

## 2026-10-25 当前 SHA Action 入口复验

在同一当前制品的管理员会话中复验了三类详情的 Action 菜单：Deployment 显示回退、自动扩缩、编辑设置、编辑 YAML、重新创建和删除；StatefulSet 额外显示编辑服务；DaemonSet 不显示副本数、自动扩缩和编辑服务入口。Deployment 的自动扩缩和 YAML 弹窗、StatefulSet 的编辑服务弹窗均能打开并使用取消关闭，未提交资源修改。该记录只关闭入口渲染和资源差异样本，不代表这些 Action 的成功、失败、冲突、网络和 RBAC 组合全部通过。结构化证据见 [`workload-action-surface-verify-20261025.json`](./evidence/workload-action-surface-verify-20261025.json)。

## 2026-10-25 当前 SHA namespace 正反隔离复验

为避免 Workspace 级 viewer 权限覆盖项目边界，本轮使用只绑定 `v4-migration-e2e` 项目 viewer 的临时账号。允许 namespace 的 Deployment 详情可读且写入口隐藏；未授权的 `v4-migration-e2e-isolation` Deployment 详情直接跳转 `/errors/403`，资源内容不可见。测试期间临时给第二 namespace 添加的 Workspace 标签、Deployment、用户和 RoleBinding 均已清理或恢复，namespace 本身保留。结构化证据见 [`workload-namespace-isolation-current-head-verify-20261025.json`](./evidence/workload-namespace-isolation-current-head-verify-20261025.json)。列表路由的低权限缓存切换、刷新和返回组合仍未关闭。

## 2026-10-25 当前 SHA 宽度修复 VERIFY

| 项目        | 结果                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| 分支 / 提交 | `feature/v4-workloads` / `2b0c2c6de2dddddc825b4606897e0362e299cad0`                                   |
| CI          | Run `40124472412`；Unit tests、Build and publish ks-console 均成功                                    |
| 镜像        | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261025-031645-2b0c2c6de2dd`                       |
| 镜像 digest | `sha256:b23b9b5ea4836778357fd5919c5b002f02a229d87b0e854f9172e47b969ecfdd`                             |
| 131 rollout | `kubesphere-system/ks-console` 成功，Deployment generation `603`，`1/1` Ready                         |
| Pod imageID | `ghcr.io/mysstack/ks-console@sha256:b23b9b5ea4836778357fd5919c5b002f02a229d87b0e854f9172e47b969ecfdd` |
| Playwright  | 已认证会话完成 Deployment、StatefulSet、DaemonSet 编辑设置渲染复验                                    |

本轮在 `1280×720` 视口下确认三类资源编辑设置弹窗内部 `.kubed-modal` 的宽度均为 `1162px`，左侧为 `59px`，与 `release-4.1.5` 对照页面的宽度观察一致。StatefulSet 额外确认了副本分组序号和持久卷声明模板；DaemonSet 额外确认了最大不可用容器组数量和容器组就绪最短运行时长；三类资源均显示容器和元数据原生区域。

本轮页面仍记录到 8 个扩展初始化错误（包括 `getExtensionConsoleV3Embed`、`ConfigConstants` 和 `getStoreWithQueryHooks` 相关错误）。这些错误属于已登记的扩展运行时范围，按项目决定暂不在 Workload 本轮修复；不能把它们记为 Workload 页面零错误。

本轮关闭了“当前制品仍使用 `960px` 弹窗宽度”的 VERIFY 缺口，但没有关闭 Tab 内容切换、完整布局交互、低权限浏览器正反路径、缓存失效、错误/取消矩阵和全部 V3 功能逐项等价。Workload 模块继续保持 `VERIFY / 进行中`，不进入 PR 验收。

## 1. 本轮边界

本轮验证对象是 `feature/v4-workloads` 的代码提交 `54b863b2ccd611bab088d39bcbebc8b4e9f68500` 对应制品。REA 主基线采用 `release-4.1.5` 完整前端源码和同版本已部署页面；旧 `v3dist` 只用于制品校准，`origin/release-3.4` 只在当前版本无法解释时补充参考。

本轮不修改稳定分支、集成分支或非测试业务资源，不把历史 SHA 的浏览器结果继承为当前制品通过。

## 2. 构建与部署证据

| 项目              | 结果                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| 分支 / 代码提交   | `feature/v4-workloads` / `54b863b2ccd611bab088d39bcbebc8b4e9f68500`                                   |
| CI                | Run `40100881163`；Unit tests 与 Build and publish 成功                                               |
| 镜像              | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261024-220602-54b863b2ccd6`                       |
| 镜像 digest       | `sha256:53299da2a0add86f3c08208b8ed9728d39af31ae5c0ba7b315283dc5bfdc675a`                             |
| 集群 / Deployment | context `default`；`kubesphere-system/ks-console`；NodePort `30880`                                   |
| rollout           | 成功，副本 `1/1`，Pod Ready                                                                           |
| 实际 Pod          | `ks-console-7c987bf54b-4gjkz`                                                                         |
| Pod imageID       | `ghcr.io/mysstack/ks-console@sha256:53299da2a0add86f3c08208b8ed9728d39af31ae5c0ba7b315283dc5bfdc675a` |

本地 `corepack yarn build:packages`、`./scripts/test.sh`、相关定向测试和 `git diff --check` 已完成；本地完整 webpack 构建在加载 `NODE_OPTIONS=--openssl-legacy-provider` 后成功。首次未设置该兼容参数时的 OpenSSL 错误属于本地 Node 运行环境，不是本轮代码构建失败。

## 3. 浏览器复验结果

复验工具为 Playwright CLI。使用已建立的 30880 测试会话在 rollout 后重新加载页面，确认页面显示 `platform-admin`。本轮新建零 Cookie 会话并按 `/home/bruce/.bashrc` 环境变量登录时，登录接口返回业务错误，因此新登录链路标记为未通过；已认证会话的结果只作为页面与请求复验，不替代登录门禁。

### 已通过的当前制品场景

- 项目级 Deployment、StatefulSet、DaemonSet 列表均渲染原生 Workload 页面，并只显示 `v4-migration-e2e` namespace 的资源。
- 三类资源详情页完成直达与渲染检查；StatefulSet 详情页显示 1/1 资源状态，Deployment、StatefulSet 和 DaemonSet 的原生编辑设置入口均已打开并完成取消路径复验。
- Deployment 和 StatefulSet 的原生“编辑设置”显示更新策略、容器组、存储、调度、优雅终止和元数据分区；StatefulSet 额外显示副本分组序号和 PVC 模板；取消路径通过。
- DaemonSet 的原生“编辑设置”不显示副本数，显示其更新策略和就绪时间字段；取消路径通过。
- 集群级 `/clusters/host/deployments` 渲染原生列表，并显示“全部项目”筛选入口；该入口结果不能推断为项目 namespace 过滤结果。
- 配置引用页面原生显示 ConfigMap/Secret 名称、前缀和键名，Secret 值不出现在页面；相关 API 请求返回 200。
- StatefulSet `v4-watch-sts-20261022-01` 完成服务和设置保存回读验证：编辑服务保持原值确认时 namespace 作用域 PATCH 返回 200；编辑设置临时修改测试标签后 PUT、回读 200，再恢复原值并回读 200；StatefulSet 保持 `1/1`，Service 的 Headless、端口和 selector 保持一致；证据见 [`evidence/workload-statefulset-service-verify-20261025.json`](./evidence/workload-statefulset-service-verify-20261025.json)。
- Deployment `v4-deploy-edit-ef3` 的“编辑设置”页面在当前制品上完成保存回读验证：临时修改测试标签、通过 namespace 作用域 PUT 保存并回读 200，再恢复原值并回读 200；Deployment 全程保持 `1/1` Ready 并完成 rollout；证据见 [`evidence/workload-deployment-settings-verify-20261025.json`](./evidence/workload-deployment-settings-verify-20261025.json)。
- DaemonSet `v4-stop-ds-7fa` 完成设置保存回读验证：临时修改测试标签、通过 namespace 作用域 PUT 保存并回读 200，再恢复原值并回读 200；DaemonSet 全程保持 `1/1` Ready 并完成 rollout，页面未显示副本数量编辑，现有 nodeSelector 保持不变；证据见 [`evidence/workload-daemonset-settings-verify-20261025.json`](./evidence/workload-daemonset-settings-verify-20261025.json)。
- DaemonSet 停止成功路径已在当前制品补测：项目列表选择 `v4-stop-ds-7fa` 后点击“停止”，namespace 作用域 PATCH 返回 200，`non-existing=true` 后状态为 `0/0`，页面显示“已停止”。对照 `release-4.1.5` 完整源码和旧 V3 Store，基线同样只提供停止动作，没有产品层恢复入口；本轮通过已授权测试资源补丁移除临时 selector，完成夹具清理并恢复 `1/1`。证据见 [`evidence/workload-daemonset-stop-recovery-verify-20261025.json`](./evidence/workload-daemonset-stop-recovery-verify-20261025.json)。
- 当前部署制品补充了三类 Workload 的删除、Deployment 伸缩、回退、重新创建、冲突反馈和网络失败反馈验证：两个专用 Deployment 在原生项目列表执行批量删除，StatefulSet 和 DaemonSet 分别执行删除，所有 namespace 作用域 DELETE 均返回 200，页面和 Kubernetes 均无残留；`v4-deploy-edit-ef3` 通过原生“编辑设置”将副本数 `1 → 2 → 1`，两次 PUT 返回 200，API 回读和 rollout 均成功并恢复 `1/1`；详情页回退到修改记录 `#30` 的 PATCH 返回 200，rollout 成功并恢复 `1/1`；三类详情页的“重新创建”PATCH 均返回 200，分别完成 `1/1` rollout；外部更新造成的旧编辑快照 PUT 返回 409，页面保留编辑内容并提示取消后重新打开，冲突标签已清理；浏览器 offline 保存显示失败反馈，草稿未写入。证据见 [`evidence/workload-action-mutation-verify-20261025.json`](./evidence/workload-action-mutation-verify-20261025.json)。
- 当前制品的 namespace 缓存补测确认：项目 `v4-migration-e2e` 页面不显示第二 namespace 的测试资源；第二 namespace `v4-migration-e2e-isolation` 因缺少 `test-workspace` 关联返回 `namespace not found`，无法完成第二项目路由的切换回读。该 namespace 中本轮创建的 fixture 已清理，namespace 保留；证据见 [`evidence/workload-cache-namespace-verify-20261025.json`](./evidence/workload-cache-namespace-verify-20261025.json)。
- 本轮 Workload 页面请求未发现 `/consolev3`、`/dist/v3dist` 或 Wujie 入口请求。
- 列表、详情、编辑设置和配置引用完成 DOM 快照，编辑设置完成截图检查。

### release-4.1.5 源码与已部署页面的直接 REA 对照

本轮按修订后的基线重新取证：`release-4.1.5` 完整源码 commit
`fc1253cbedd5ade51a6c87bfff4e1f3b38536a84` 和 131 上的
`ks-console-v415-rea:30881` 是当前版本主参照；`origin/release-3.4` 只保留为当前版本无法解释时的历史补充。
没有把旧 V3 源码或旧 V3 弹窗直接复制进 V4。

- REA 对 release 源码树建立了完整制品身份，针对 Workload 入口、详情、路由、设置和公共组件选择 61 个源文件分析；REA Evidence 为 `ev_b69ce3fcb45e1f5e7680d64bafd0616db65e80df033fa9f6a4c1948b3236f0b`，制品摘要为 `b7101ae6614a28bc12f447385b83eadc76dcc867e5b45e292fcbde1d13aee8f0`。未选中的源码和未执行的 bundle 关系仍按未知项处理。
- release-4.1.5 Deployment 详情源码仍包含 `useV3action` 和 `renderV3Modal`；当前 V4 详情源码改用 `WorkloadSettingsModal`、`usePutMutation` 和原生路由/API。该差异证明 V4 需要按 release 行为重建，不能把 V3 Action 当作实现方案。
- 30881 的 release 页面编辑设置显示五个分区导航：更新策略、容器、存储、容器组调度规则、容器组优雅终止；初始更新策略为滚动更新，最大不可用和最大多余容器组数量均为 `25%`。
- 30880 的当前 V4 页面在同一 Deployment 和 namespace 上返回 200，显示原生设置导航、名称/项目/副本数量、容器与初始化容器、Pod 安全上下文、存储、调度、优雅终止和元数据；同时保留 `25%` 更新策略默认值，并增加配置引用 Tab 和自动扩缩入口。
- StatefulSet 对照已补齐：release-4.1.5 显示编辑服务、分区序号和持久卷相关设置；当前 V4 保留分区序号，并显示持久卷声明模板、原生容器和元数据设置，编辑服务仍在 Action 菜单中。
- DaemonSet 对照已补齐：两套页面都没有副本数编辑，均显示最大不可用容器组数量和最短就绪运行时长；当前 V4 额外以原生容器组设置和元数据分区呈现。DaemonSet 的停止语义仍按单独运行时证据核对，不能由表单字段对照替代。
- 样式计算结果显示两套页面的白底、`4px` 圆角和阴影一致，但 release-4.1.5 使用约 `1162×593` 的 Tab 弹窗，当前 V4 使用约 `960×655` 的单文档滚动弹窗；这属于已确认的布局/交互差异，已列入 DEV 修复清单，不能把字段相同当成样式等价。
- 以上证据已经可以直接指导字段、布局、样式、Action、API 和错误态矩阵；不能据此宣称三类资源已经逐项等价。详细身份和差异见 [`evidence/workload-release415-source-runtime-rea-20261025.json`](./evidence/workload-release415-source-runtime-rea-20261025.json)。

### 低权限浏览器结果

- 当前没有可复现的低权限账号登录凭据。先前已认证会话不能替代低权限账号的零 Cookie 登录；本轮未把管理员会话或历史结果标记为低权限通过。
- 因此当前制品的低权限 Deployment 读取、编辑拒绝、删除拒绝、StatefulSet Service 拒绝和 403/404 组合路径仍未完成。
- Kubernetes `auth can-i` 的静态结果不能替代浏览器登录后的 Console 权限结果；取得专用 viewer 会话后需要在当前 30880 制品上重新执行并记录。

### 低权限配置引用复验

低权限账号在当前制品上打开 Deployment 配置引用页面成功。ConfigMap、Secret 列表和详情均使用 `v4-migration-e2e` namespace 路径并返回 200，页面不展示 Secret 值，未修改资源。独立 ConfigMap 列表页面仍发起缺少 namespace 的集群级请求并返回 403；该问题已登记为配置资源与共享列表底座依赖，不作为本轮 Workload 分支的业务代码修改。

### 尚未闭环的场景

- 当前制品的新 Cookie 登录链路未通过，低权限浏览器会话尚未建立，完整 RBAC 正反路径不能验收。
- Deployment、StatefulSet、DaemonSet 仍需按 release-4.1.5 页面逐项完成设置字段、样式、校验、取消和错误态对照；当前只完成了 Deployment 的直接对照样本。
- 当前制品仍需补齐 HPA/YAML、重启及适用 Action 的逐项浏览器结果，并完成 StatefulSet、DaemonSet 的同基线运行时对照。
- 完整 namespace 正反隔离和缓存失效仍需在当前制品上补齐；历史证据不继承。
- 扩展初始化错误仍按负责人决定暂不纳入 Workload 模块验收，但不能写成控制台零错误。

## 4. 阶段结论

当前制品已完成构建、推送、部署、rollout、Pod digest 核对和部分浏览器页面复验。由于本轮基线对照确认编辑设置弹窗存在布局和分区交互差异，模块阶段已回到 `DEV / 进行中`；修复后的新 SHA 必须重新完成构建、部署和浏览器 VERIFY。本记录不批准模块进入 PR，不标记 Deployment、StatefulSet 或 DaemonSet 已验收。

结构化证据：[workload-current-head-verify-20261024.json](./evidence/workload-current-head-verify-20261024.json)。
