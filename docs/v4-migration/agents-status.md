# 当前 Workload 执行状态（2026-10-25）

- 当前阶段：`DEV / 进行中`。第二次修复制品已部署，但浏览器确认详情页仍通过通用 `useCommonActions` 的 `yaml.load` 发送非法 YAML；已按门禁再次退回 DEV。
- 上一轮验证制品：代码提交 `2676f00d054e11f6b8569e6f9b889e1cefbfba88`；CI Run `40135662495`；镜像 `feature-v4-workloads-20261025-054831-2676f00d054e`；digest `sha256:44cc6e8a48d1c720e4791fdbba3480a4dbae16bd3c9201e82d401fdf4647c920`；131 rollout 和 Pod imageID 核对成功，Pod `ks-console-5f8c884f5c-dxzjz` 为 `1/1` Ready。以下浏览器结果仅作为退回 DEV 的回归证据。
- 当前浏览器结果：已认证会话在当前制品上完成 Deployment、StatefulSet、DaemonSet 的编辑设置分区切换复验；每次只显示当前分区，弹窗宽度均为 `1162px`，取消路径通过。低权限正反、缓存、错误和逐项等价性仍未闭环。
- 本轮已从 `/home/bruce/.bashrc` 加载测试账号环境变量并尝试新的零 Cookie 登录，但页面返回通用登录失败提示，未建立新认证会话；分区验收继续使用已有认证会话。页面仍有已登记的扩展初始化错误，不记录为控制台零错误。结构化证据见 [`workload-settings-tabs-verify-20261025.json`](./evidence/workload-settings-tabs-verify-20261025.json)。
- 当前制品已补做低权限浏览器复验：临时 viewer 新零 Cookie 登录成功，Deployment、StatefulSet、DaemonSet 详情均为只读，编辑/删除入口未显示；配置引用页可读但添加、删除和应用控件禁用。临时用户和绑定已清理。第二 namespace 项目路由返回页面未找到，未把它单独记为完整隔离通过。证据见 [`workload-rbac-current-head-verify-20261025.json`](./evidence/workload-rbac-current-head-verify-20261025.json)。
- 当前制品又完成三类详情 Action 入口复验：Deployment 的自动扩缩/YAML、StatefulSet 的编辑服务、三类的编辑设置/回退/重新创建/删除入口按资源差异显示；只打开并取消，未提交修改。证据见 [`workload-action-surface-verify-20261025.json`](./evidence/workload-action-surface-verify-20261025.json)。
- 当前制品已补齐项目级 namespace 正反隔离：只绑定第一项目 viewer 的临时账号可读第一 namespace，直达第二 namespace 资源跳转 `/errors/403`；第二 namespace 临时 Deployment、用户、绑定和 Workspace 标签均已清理/恢复。列表缓存切换、刷新和返回组合仍未完成。证据见 [`workload-namespace-isolation-current-head-verify-20261025.json`](./evidence/workload-namespace-isolation-current-head-verify-20261025.json)。
- 当前制品已补做集群级 Deployment 列表 namespace 缓存样本：`v4-migration-e2e` → `dev-biz` → `v4-migration-e2e` 切换后列表分别只显示当前项目资源，刷新后仍保持当前 namespace 两条资源。低权限列表、StatefulSet/DaemonSet 列表、详情返回和完整用户/namespace 缓存组合仍未完成。证据见 [`workload-cluster-namespace-cache-verify-20261025.json`](./evidence/workload-cluster-namespace-cache-verify-20261025.json)。
- 当前制品已完成 Deployment 自动扩缩一次真实保存与回读：浏览器保存 CPU 50%、最小副本 1、最大副本 2，API 回读一致，重新打开页面显示一致；随后删除测试 HPA，Deployment 保持 1/1。完整错误、冲突、权限和其他 Action 矩阵仍未完成。证据见 [`workload-hpa-save-readback-verify-20261025.json`](./evidence/workload-hpa-save-readback-verify-20261025.json)。
- 当前制品已完成 Deployment YAML 测试字段添加、浏览器回读和清除：annotation 写入 API 后重新打开编辑器可见，随后通过浏览器保存清除，API 无残留且 Deployment 保持 1/1。StatefulSet/DaemonSet YAML 及非法、冲突、权限和网络失败路径仍未完成。证据见 [`workload-yaml-save-readback-verify-20261025.json`](./evidence/workload-yaml-save-readback-verify-20261025.json)。
- 当前制品已补齐 StatefulSet 与 DaemonSet YAML 测试字段添加、浏览器回读和清除；StatefulSet 保持 1/1，DaemonSet 保持 1/1，测试字段均无 API 残留。非法 YAML、冲突、权限、网络失败和完整 V3 等价仍未完成。证据见 [`workload-yaml-resource-kinds-verify-20261025.json`](./evidence/workload-yaml-resource-kinds-verify-20261025.json)。
- 当前主基线：`release-4.1.5` 完整前端源码及同版本已部署页面 `192.168.2.131:30881`；源码定位实现，页面核对真实渲染、交互、Network、错误和权限。
- 制品校准：同版本 `v3dist` tree `1e499d92e11374e26c76f5e13be45251602bd596`；旧 V3 参考 `origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26` 仅在当前版本无法解释时补充使用。
- 开发路线：REA 输入已经完成当前版本绑定；第二次修复只覆盖项目列表页，详情页缺陷未闭环。必须修复 `packages/shared/src/hooks/useCommonActions/index.tsx`，再重新构建、部署并在当前制品上完成浏览器验证，旧制品结果不能继承。
- 下方历史状态不能覆盖上述当前状态。

# 当前状态补充（2026-10-25：分区显示修复重新进入 VERIFY）

- `release-4.1.5` 已部署页面的编辑设置使用左侧分区切换，点击“容器”后只显示容器内容；当前 V4 原实现使用滚动定位，同时把全部分区内容保留在页面中。这是已确认的当前版本 UI/交互差异，不能仅凭弹窗宽度一致关闭。
- 已在 `WorkloadSettingsModal.test.ts` 增加“只显示当前分区内容”的回归测试，先得到失败结果，再补充 `hidden`、`role=tabpanel`、`aria-selected` 和分区关联属性。定向测试、全量 91 个测试文件/404 个断言和 `build:packages` 已通过。
- 代码提交 `5f5a7df73` 已完成 DEV；此前 `2b0c2c6de` 制品的 VERIFY 结果只作为宽度输入。当前阶段重新为 `VERIFY / 进行中`，必须以当前阶段 SHA 的新制品完成部署和浏览器验收，不进入 PR。

# 当前状态补充（2026-10-25：宽度修复制品部署与浏览器复验）

- 本轮按 `release-4.1.5` 完整源码及同版本部署页面作为 REA 主基线，未把旧 `origin/release-3.4` 当作当前实现来源；旧 V3 仅保留为历史字段关系补充。
- 提交 `2b0c2c6de2dddddc825b4606897e0362e299cad0` 已由 CI Run `40124472412` 构建并推送。镜像 `feature-v4-workloads-20261025-031645-2b0c2c6de2dd` 的 digest 为 `sha256:b23b9b5ea4836778357fd5919c5b002f02a229d87b0e854f9172e47b969ecfdd`；131 `ks-console` rollout 成功，Pod imageID 与该 digest 一致。
- 已认证 Playwright 会话完成三类资源编辑设置渲染复验：Deployment `v4-deploy-edit-ef3`、StatefulSet `v4-watch-sts-20261022-01`、DaemonSet `v4-stop-ds-7fa` 的 `.kubed-modal` 宽度均为 `1162px`。StatefulSet 的副本分组序号/PVC 模板、DaemonSet 的最大不可用数量/就绪最短运行时长、三类资源的容器和元数据区域均可见。
- 当前页面仍有 8 个扩展初始化错误，按项目决定暂不纳入 Workload 本轮修复；这不等同于页面零错误。当前仍未完成 Tab 交互、低权限浏览器正反、缓存失效、错误/取消矩阵和全部 V3 功能等价，模块不进入 PR 验收。

# 当前状态补充（2026-10-24：重新绑定输入后的 REA 复核）

- 最近一次 REA 文档提交：`ffc2b27e785dff7518c5db7e5fb667e416080139`；最新对照记录已推送到 `origin/feature/v4-workloads`。
- 新增[Workload 组合批次 REA 复核记录](./workload-rea-review-20261024.md)：纠正了当前源码事实，确认 Deployment、StatefulSet、DaemonSet 三个详情页均打开原生 `WorkloadSettingsModal`，YAML 为独立 Action；本轮又补充了 StatefulSet/DaemonSet 详情页的真实浏览器对照和读请求证据，同时重新登记资源差异和未验证项。
- 当前门禁仍为 `REA / 分析中，待复核`。历史 DEV、VERIFY、镜像和浏览器结果不继承为当前阶段通过；本轮没有修改业务代码、构建、部署或执行模块验收。
- 当前待复核项：当前 SHA 的完整字段保存、配置引用、DaemonSet 停止语义、RBAC 正反权限、namespace 缓存隔离、错误/取消路径、集群级 V3/Wujie 边界和三类逐项 V3 等价性。

# 当前状态补充（2026-10-24：当前 HEAD 设置入口部署后复验）

- 当前制品源码提交 `31b6d88fc7e87707776c094aee12f1cdcb02604b`（之后仅有记录提交）的 CI Run `40048500939`、镜像 `feature-v4-workloads-20261024-091102-31b6d88fc7e8`、digest `sha256:2956710cd7ef2fbda79ff7a0a9695dac466336bd08248784d5afdfb577b951d3` 与 131 Pod imageID 一致，rollout/Ready 通过。
- 使用已有认证态在当前制品重新打开三类详情的“编辑设置”：Deployment、StatefulSet、DaemonSet 均打开原生 `WorkloadSettingsModal`，StatefulSet 显示 PVC 与调度分区，DaemonSet 不显示副本数/调度分区，YAML 是独立 Action。三类资源均实际执行终止宽限期 `30 → 31 → 30`，页面保存后 Kubernetes API 回读一致。该结果关闭“当前版本仍将编辑设置跳转 YAML”的入口缺口，并补齐一个当前制品的保存回读场景。
- 当前设置页面使用已有会话；另起零 Cookie 新 context 登录当前制品仍失败，页面显示账号或密码错误，未进入工作负载页面。页面 Console error 为 Deployment 8、StatefulSet 10、DaemonSet 8，错误归因、完整字段等价、RBAC、缓存和错误矩阵仍未完成。结构化证据见[当前 HEAD 原生设置复验](./evidence/workload-native-settings-current-head-20261024.json)。
- 当前阶段仍为 `VERIFY / 未完成`。

# 历史状态记录（2026-10-24：源码提交 ae500da 的制品拉取延迟）

- 当前 HEAD `ae500da86a559b378ba7255ee1d21c3d95a3a768` 的 CI Run `40046932193` 已完成单元测试和镜像构建，制品为 `feature-v4-workloads-20261024-085149-ae500da86a55@sha256:325f455ab8388f65ab1da254a4ca17d298baa45a118d38b12969c64db175bef5`。
- 131 部署尝试创建新 Pod `ks-console-87f865b86-h7kpp`，长时间处于 `ContainerCreating`，没有取得新制品的 Ready/imageID 和浏览器证据；已回滚到部署前制品，回滚 rollout 和旧 Pod Ready/imageID 通过。详细证据见[当前 HEAD 制品部署记录](./evidence/workload-current-head-deploy-pull-20261024.json)。
- 回滚前使用已有认证态在旧精确制品上重新确认：StatefulSet、DaemonSet 的“编辑设置”均打开原生 `WorkloadSettingsModal`，分别渲染当前实现的设置分区；“编辑 YAML”是独立操作。该结果纠正历史 REA 文档中的过时入口描述，但不继承为当前 HEAD VERIFY。见[旧制品原生设置证据](./evidence/workload-native-settings-old-artifact-20261024.json)。
- 该次部署尝试不代表当前制品状态；当前制品已在后续精确部署中完成 Ready 和设置入口复验。模块仍为 `VERIFY / 未完成`，原因见上方当前状态。

# 当前状态补充（2026-10-24：已有登录态完成三类批量删除复验）

新制品在 131 的新浏览器登录仍失败并已回滚；回滚前使用已有登录态完成 Deployment、StatefulSet、DaemonSet 批量删除，StatefulSet 关联 Headless Service 同步清理，DaemonSet 两次 DELETE 为 200 OK，API 复核专用资源均已不存在。该结果关闭了本次修复对应的批量删除行为缺口，但不关闭新制品正常登录、完整错误矩阵、缓存切换和逐项 V3 等价，模块保持 `VERIFY / 未完成`。

# 当前状态补充（2026-10-24：批量删除修复制品登录失败并回滚）

批量删除修复制品已完成 131 rollout 和镜像身份核对，但新浏览器 context 登录返回 `Incorrect username or password`，未执行 Workload 浏览器验证。已按规则回滚至部署前精确制品，回滚 rollout、Pod Ready 和 Pod imageID 通过。登录失败原因未归因；批量删除修复不能标记为 VERIFY 通过，模块保持 `VERIFY / 未完成`。证据见 [批量删除制品部署与登录证据](./evidence/workload-batch-delete-deploy-login-20261024.json)。

# 历史记录：批量删除修复已构建（后续已部署并因登录失败回滚）（2026-10-24）

批量删除参数修复已提交于 `9a5bd5cdc22ec7877c33773ca1ba8562a463bcd6`。本地 `./scripts/test.sh` 通过 91 个测试文件、402 项测试，`corepack yarn build:packages` 通过；CI Run `40042145365` 成功，精确制品为 `feature-v4-workloads-20261024-075502-9a5bd5cdc22e`，镜像 digest 为 `sha256:cb4e48ff69f11fe829586f5134c0de24831895a46f558f2fdf9f85a1a19861f0`。

该段记录形成时尚未将该新制品部署到 131；随后已完成一次精确部署，但因浏览器登录失败按规则回滚。StatefulSet 关联 Service、Deployment/StatefulSet/DaemonSet 批量删除成功路径仍未在可登录的新制品上复验；模块保持 `VERIFY / 未完成`。

# 当前状态补充（2026-10-24：批量删除关联资源缺陷）

131 真实浏览器复验发现：旧精确制品执行 StatefulSet 批量删除后，StatefulSet 已删除，但其 Headless Service 残留。根因是页面批量删除参数转换丢弃 `annotations`，与 Store 中已有的关联资源清理逻辑脱节。已补充最小代码修复和参数传递回归测试，Workload 从 `VERIFY` 退回 `DEV`。新制品尚未构建、部署或浏览器复验，不能报告批量删除通过。证据见 [批量删除缺陷取证](./evidence/workload-batch-delete-defect-20261024.json)。

# 当前状态补充（2026-10-24：Deployment 回退实际写入复验）

专用 Deployment `v4-deploy-edit-ef3` 已在当前精确制品上通过浏览器选择回退目标 `#27`，PATCH 返回 200，弹窗关闭，Kubernetes rollout 成功并恢复 1/1 Ready，临时验证注解已移除。证据见 [Deployment 回退浏览器复验](./evidence/workload-rollback-browser-verify-20261024.json)。批量删除成功、伸缩确认、完整错误/缓存和逐项 V3 等价仍未完成，模块继续保持 `VERIFY / 未完成`。

# 当前状态补充（2026-10-24：集群级原生列表浏览器复验）

精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 在 131 的 `/clusters/host/deployments`、`/clusters/host/statefulsets`、`/clusters/host/daemonsets` 均完成零 Cookie 登录和页面复验：专用 fixture 可见、namespace 控件可见、页面错误为 0，未出现 `/consolev3` 或 `/dist/v3dist` 请求。证据见 [集群级原生列表浏览器复验](./evidence/workload-cluster-native-browser-verify-20261024.json)。批量删除确认后的成功结果仍未验证，Workload 继续保持 `VERIFY / 未完成`。

# 当前 Workload VERIFY 进展（2026-10-24）

- 当前负责人：Codex 单会话；分支 `feature/v4-workloads`；Worktree `console-workloads`；无子 Agent。
- 精确制品：源提交 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5`，镜像 `feature-v4-workloads-20261024-050150-24c6afa03849`，digest `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76`，131 Pod imageID 与 digest 一致。
- 本轮已验证：三类配置引用保存/取消/刷新/受控失败/恢复；详情 Action 菜单和取消；三类重新创建实际 PATCH 及回读；Deployment 回退实际写入并恢复 Ready；DaemonSet 批量停止及恢复；低权限拒绝和第二 namespace 正反隔离；三类路由无 `/consolev3`、无 `/dist/v3dist` 请求。
- 尚未闭环：批量删除成功、伸缩确认后的实际 HPA/副本结果、完整网络/错误矩阵、缓存跨 namespace/user 切换、逐项 V3 功能等价。因此模块仍为 `VERIFY / 未完成`，PR #2 保持 Draft。
- 证据：[配置引用](./evidence/workload-config-reference-browser-verify-20261024.json)、[Action](./evidence/workload-action-browser-verify-20261024.json)、[低权限与 namespace](./evidence/workload-rbac-namespace-verify-20261024.json)、[无 V3 预加载](./evidence/workload-v3-preload-verify-20261024.json)。

# 当前状态补充（2026-10-24：低权限 RBAC 复验）

- 当前精确制品低权限复验完成：viewer 账号可读三类配置引用页，更新请求分别返回 403，资源版本和 envFrom 保持不变。
- Kubernetes 授权事实：`v4-migration-e2e` namespace 的 get/list/watch 为允许，update 为拒绝；`default` namespace get 为拒绝。
- 第二 namespace fixture 已完成正反隔离复验：viewer 对第二 namespace 的 get/list 均拒绝，第一 namespace 列表只返回本 namespace 资源；临时 Deployment 已清理、namespace 保留。完整 Action、缓存失效和逐项 V3 等价仍未完成。
- 证据：[Workload 低权限与 namespace 复验](./evidence/workload-rbac-namespace-verify-20261024.json)。

# 当前状态补充（2026-10-24：全局 V3 预加载验证通过）

- 精确源提交 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5`、CI Run `40023514250`、镜像 tag `feature-v4-workloads-20261024-050150-24c6afa03849`、digest `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76` 已完成 131 rollout，Pod Ready/imageID 一致。
- 零 Cookie 浏览器登录成功；三类原生 Workload 列表/详情直达、刷新、返回、namespace API 作用域和设置界面通过，Network 未发现 `/consolev3` 或 `/dist/v3dist` 请求，页面错误为 0。
- 当前结论：本轮共享启动层 V3 全局预加载缺口已关闭；Workload 仍保持 `VERIFY / 未完成`，全部 Action、低权限 RBAC、缓存失效和逐项 V3 等价性仍需继续验证。
- 证据：[当前 Workload V3 预加载关闭验证](./evidence/workload-v3-preload-verify-20261024.json)。

# 当前状态补充（2026-10-24：全局预加载已移除，进入 VERIFY）

- DEV 修复提交：`45d9f14e5d0d3a8a6d1f6e3b17f395a30c5adf87`；移除 `packages/core/src/utils/wujie.ts` 的全局 `preloadApp()`，保留 `setupApp()` 按需注册。
- 本地验证：90 个测试文件、401 项通过；`corepack yarn build:packages` 和 `git diff --check` 通过。
- 当前阶段：`VERIFY`。下一步构建并部署新制品，确认登录后首次进入三类 Workload 页面不再产生 `/consolev3` 或 `/dist/v3dist` 请求。
- 其他完整验收项（全部 Action、低权限 RBAC、缓存、V3 逐项等价）仍未关闭；PR #2 保持 Draft。

# 当前状态补充（2026-10-24：首次预加载修复未闭环，退回 DEV）

- 131 精确制品 `88b587f947ca9da929821eb372331eb8785db2ed` 的浏览器复验确认：三类原生页面和编辑设置均可用，但登录后 dashboard 的延迟 V3 资源请求仍可能在首次 Workload 导航期间出现；此前“只按当前 pathname 跳过”不足以关闭运行时问题。
- 根因仍是 `packages/core/src/utils/wujie.ts` 中共享初始化层调用 `preloadApp()`；下一步移除全局预加载，仅保留 `setupApp()`，让仍需兼容的旧入口按需挂载。
- 阶段从 `VERIFY` 退回 `DEV`；代码修复完成、测试、重新构建和部署前不再沿用 `88b` 的通过结论。

# 当前状态补充（2026-10-24：V3 预加载修复进入 VERIFY）

- DEV 已完成：`fbf84fa223b43c8b48ac407fbcf4c35a0580f2ab`，新增路由判断与回归测试；90 个测试文件、402 项通过，`corepack yarn build:packages` 通过。
- CI Run `40018472891` 成功，镜像 tag `feature-v4-workloads-20261024-042200-fbf84fa223b4`，digest `sha256:1ca3e9ab0172099ebfab5adeb30eeedad72da9aee91ab3dab6d4c7b407152aa2`。
- 当前阶段已回到 `VERIFY`，下一步仅部署该精确制品并复验三类原生 Workload 路由不再请求 `/consolev3` 或 `/dist/v3dist`，同时重跑必要的页面渲染和行为检查。
- 完整设置、RBAC、namespace 隔离、缓存、全部 Action 和 V3 等价性仍未整体验收；PR #2 继续保持 Draft。

# 当前状态补充（2026-10-24：V3 预加载缺口）

- 当前模块：`workloads`，分支 `feature/v4-workloads`，Worktree `console-workloads`；单 Codex 顺序执行，无子 Agent。
- 精确制品：源提交 `8220090837bf9fe1e924578cc3bfc9e3115608ac`，镜像 tag `feature-v4-workloads-20261024-024809-8220090837bf`，digest `sha256:b0903903c81b655c7e65c7085ced370d6ff04fde303244f7de35e20e744766b0`。
- 已验证：新 context 登录成功；三类原生 Workload 详情页直达、刷新、返回、设置页面渲染和项目 namespace API 作用域通过，页面错误为 0。
- 新发现且未关闭：三类原生路由仍观察到 `/consolev3/dashboard` 与 `/dist/v3dist/*` 请求。根因是 `run.tsx` 无条件调用 `initWujie()`，`utils/wujie.ts` 无条件 `preloadApp()`。
- 阶段调整：模块从 `VERIFY` 退回 `DEV`。必须先完成测试锁定、最小代码修复、构建和新制品浏览器复验；旧镜像和本轮修复前证据不继承为当前通过。
- 证据：[Workload 原生路由 V3 预加载复现](./evidence/workload-native-v3-preload-20261024.json)。

# Workload 模块任务状态

> 2026-10-24 当前进展：DEV 源提交 `3e1d40eae` 的 400 项本地回归通过；构建提交 `3d255eaf8` 的 CI Run 40000821377 和首次 131 rollout 成功。新 context 登录未通过后已回滚旧镜像；专用测试凭据在旧镜像也被拒绝，当前浏览器 VERIFY 阻塞。三类资源均未整体验收，旧 SHA 结果不继承。详见 [部署与回滚](./workload-131-verify-20261024.md#当前增量部署与登录阻塞0229-上海时间)。

## 唯一当前状态（2026-10-24）

- 负责人：当前 Codex 单会话，无子 Agent；能力 `deployment-statefulset-daemonset`。
- 当前阻塞：新 context 使用本机专用账号在旧镜像登录被拒绝（HTTP 200、业务 400、invalid_grant）；停止重复尝试。当前 `ef3b4f1a8` 旧镜像副本 1/1，登录页 200，认证恢复尚未通过。等待有效测试凭据后重部署同一 `3d255eaf8` 制品。
- 新制品：tag `feature-v4-workloads-20261024-020955-3d255eaf8506`，digest `sha256:d196181c25f1519f29ccc56b640c914c3b692440bbb0917a43636db925894ce4`；首部署 Pod Ready/imageID 一致后已回滚。
- 分支 / Worktree：`feature/v4-workloads` / `console-workloads`；已验证镜像 SHA `ef3b4f1a83c3b708f5a12b35dd178bf358c99b8d`。
- 当前阶段 `VERIFY`，REA 已通过；此前因设置版本差异及引用权限退回 DEV 的条目已补本地实现，源码 `3e1d40eae` 进入新制品验证，未标记已验收。
- 历史镜像 `ef3b4f1a8` 已完成三类原生设置保存/API 持久化/刷新/取消/恢复、ConfigMap 引用保存与受控 500 错误反馈，以及 StatefulSet PVC 本地化复验。Deployment Secret 共存已验证，另外两类未独立验证 Secret 引用。
- 实际 viewer 点击应用为 PATCH 403，resourceVersion 与引用均未改变；该权限缺陷已补本地实现，下一项部署新镜像并分别验证管理员与 viewer。
- 2026-10-24 DEV 增量历史：镜像凭据/GPU/协议代码已在 `b84c26590` 提交；本次补原生设置分区和容器二级编辑，组件确认/取消/校验及三类字段保留用例通过。84 文件/375 项回归通过；仍处 DEV，尚未部署/浏览器验收。设置分区代码已提交 `dd2e51c6d`；配置引用 RBAC 已补本地修复与三类回归，真实账号/当前 SHA 浏览器复验仍待执行。DS-07/08 已补 valueFrom 回填、切换、修改、删除和 optional，86 文件/383 项回归通过；环境引用代码已提交 `49967289d`；key 下拉和切换作用域隐藏旧选项已补本地修复，87 文件/386 项回归通过。镜像搜索/选择/标签/详情已补本地实现；89 文件/400 项回归通过，当前 SHA 部署后验证仍待完成。见 [增量记录](./workload-settings-dev-20261023.md#设置分区与容器二级编辑2026-10-24dev-增量)。
- [唯一阶段记录](./module-execution.json)、[本轮真实证据和剩余条件](./workload-131-verify-20261024.md)。完整 RBAC、namespace 和 V3 等价未完成，PR #2 保持 Draft。

## 2026-10-23 历史阶段记录（保留当时结论）

## 唯一当前状态（2026-10-23 组合批次范围调整）

- 负责人：当前 Codex 单会话，不使用子 Agent。模块/能力：`workloads / deployment-statefulset-daemonset`；资源：Deployment、StatefulSet、DaemonSet。
- 分支/Worktree：`feature/v4-workloads` / `console-workloads`；DEV 源提交 `f6b7c689b55b1561d474dcb6dc056a39e2166e51`。
- 当前阶段 `VERIFY`，REA 已通过、DEV 本地修复已完成；StatefulSet 创建页已复用本地化 PVC 标题和添加按钮，并补齐四种内置语言的 PVC 校验文案。精确镜像构建、131 rollout、Pod imageID 与新 SHA 浏览器渲染重验仍待执行。[阶段记录](./module-execution.json)、[DEV 完成记录](./workload-dev-completion-20261023.md)、[组合能力边界](./workload-kind-capability-matrix.md)和[测试设计](./workload-test-design-20261023.md)为当前依据。
- Deployment 页面批量删除两个专用资源时，Deployment 与 HPA 的四个 DELETE 均使用 `/clusters/host/` 并返回 200，API 回读无残留。DaemonSet 停止 PATCH 200，保留原 `kubernetes.io/os=linux` 并追加 `non-existing=true`，调度数降至 0；移除专用停止键后恢复 1/1/1。StatefulSet 从原生创建页写入 `data/16Mi/nfs-csi` 模板和 `/data` 挂载，PVC 实际 Bound。
- 当前任务：构建并部署 `f6b7c689b` 对应精确镜像，在新 Pod 上用 Playwright 重验 PVC 标题、添加按钮与校验错误不再显示原始键。TDD 红/绿、81 文件/364 项回归、packages/locales 构建、ESLint、Prettier 与差异检查已通过。已完成的 HPA、DaemonSet、PVC API 持久化、StatefulSet Service 清理、低权限 RBAC 和 namespace 证据保留。
- 当前 REA 材料已获项目负责人批准进入 DEV。复核记录见 [workload-rea-review-20261023.md](./workload-rea-review-20261023.md)。REA 当时确认的普通 Workload 配置引用 `useV3action`、Wujie Shadow DOM 和 V3 编辑器桥接已在后续 DEV 提交移除；集群级三类 Workload 主路由也已切换原生列表。旧 Embed 文件保留供其他未迁移入口审计，当前 SHA 浏览器验证仍未完成。`module-execution.json` 已记录复核依据和日期。
- 已建立 [三类资源字段行为矩阵](./workload-field-behavior-matrix-20261023.md)，覆盖公共字段、默认值/校验、清空/保留语义，以及 StatefulSet Service/PVC 模板和 DaemonSet 无副本/更新策略差异。矩阵将待实测项明确列出；字段、API、RBAC、缓存和错误仍未闭环，不改变 REA 门禁。
- 已建立 [Action、API、权限与缓存静态证据](./workload-action-api-rbac-evidence-20261023.md)，覆盖三类资源详情操作、权限键、项目 URL、HTTP 方法、删除/HPA、版本冲突和缓存失效事实；运行时 RBAC、namespace 隔离、缓存刷新和错误态仍未验证，不改变 REA 门禁。
- 已执行 [REA 阶段测试](./workload-rea-test-evidence-20261023.md)：`./scripts/test.sh` 的 70 个测试文件、287 个断言全部通过，另有 15 个 Workload 定向测试文件、106 个断言通过；其中配置引用测试验证的是当前 V3/Wujie 桥接协作，不能解释为 V3 依赖已移除。未执行当前 SHA 构建、部署和 Playwright VERIFY。
- 已补充 [旧 V3 运行时 REA](./workload-v3-runtime-rea-20261023.md)：在 131 历史镜像上只读复核 StatefulSet 设置分区和 GET 请求，未执行任何资源变更；该镜像不是当前分支 HEAD，只作为行为输入。
- 已关闭的定向未知：旧源码四个设置分区、StatefulSet Service 差异、Deployment HPA 差异，以及当前制品的普通入口和 Action 定位。DEV 验收清单待关闭：三类资源完整字段/校验、动态 Action/API/Store、RBAC/作用域和错误/缓存行为；REA 已获负责人批准，后续进入 DEV，但不代表上述缺口已完成。
- 历史取证输入 SHA：`24e87aec244ef265ef14fc3201603e42a1233978`。本轮新增确认：集群级三类入口仍挂载 Wujie/V3，两个未挂载的独立 StatefulSet/DaemonSet Embed 文件 URL 互换（不作为主入口已复现缺陷）；联邦 Deployment/StatefulSet 仍为 Wujie/V3，联邦 DaemonSet 范围未确认；普通 Workload 配置引用仍调用 `useV3action` 并绑定 V3 DOM。上述内容已列为明确缺口或高风险，不把它们当作“没有功能”。
- 当前精确代码提交的完整回归为 80 个测试文件、358 项通过；普通项目 ConfigReference 和集群级三类主列表已改为原生路由/组件。整体测试仍不覆盖当前 SHA 部署后的浏览器行为、真实 RBAC、namespace 隔离和缓存失效。
- DEV 验收清单已按代码与本地测试关闭并进入 VERIFY。原生设置、三类创建、集群级三类主入口、DaemonSet 停止补丁、StatefulSet Service/PVC 模板、三类顶层 metadata、配置引用桥接移除、回滚必填校验和 StatefulSet 创建补偿均已提交；真实制品、RBAC、namespace、缓存、错误和等价行为仍须部署后逐项验证。
- 当前模块的流程文件修复涉及所有后续模块：根目录主计划/规则/门禁脚本原位更新，版本化快照位于 `governance/`；不改公共业务组件。其他模块初始化阶段记录后才能继续，不继承 Workload 的状态。
- 2026-10-23：在原门禁基础上接入真实 Git pre-commit、中文 commit-msg 和 PR CI。隔离 Git 回归由 18 项增至 32 项，通过；初次新增用例复现 8 项失败。工具测试通过不表示业务阶段放行，PR #2 的完整差异仍需接受阶段检查；部署和浏览器未执行。详见[修复记录补充](./module-process-repair-20261022.md#2026-10-23-执行入口补强)。
- 工具代码提交 `da38cb87e` 已推送；[Run 39812232782](https://github.com/mysStack/console/actions/runs/39812232782) 的 32 项工具回归成功，阶段检查拒绝 REA 中的历史业务差异，总结果为 failure。`feature/v4-migration` 已配置这两个必需检查并对管理员生效。真实证据见[验证记录](./governance/module-gate-verification-20261023.json)；不改变当前模块 REA 状态。
- PR #2 历史 Head `24e87aec244ef265ef14fc3201603e42a1233978` 的 [Run 39855770994](https://github.com/mysStack/console/actions/runs/39855770994) 中，“门禁工具回归”成功，“模块阶段与 PR 范围”失败。失败原因为 REA/记录通道禁止业务或无关改动，首先命中 `locales/en/l10n-projects-applicationWorkloads-deployments-list.js`；完整差异还包含 Workload 业务代码。该结果证明 PR 当前不能作为 REA 记录提交，不执行历史改写或强推。
- 2026-10-23：确认 Deployment、StatefulSet、DaemonSet 放入同一 Workload 组合批次；共享实现不等于共享验收，三类资源必须分别完成 REA 证据和 VERIFY 场景。详见[组合能力边界](./workload-kind-capability-matrix.md)。

- 本轮实际取证：普通详情工厂 1216/1221/1402、Action 3595、Modal/分区 3601/3602；确认 STS/DS 原生“编辑设置”当前仍调用 YAML。13 个派生工厂已执行 REA；解析成功不表示语义完整，字段/API/RBAC/运行时维度保持未完成。证据和下一项见[组合矩阵](./workload-kind-capability-matrix.md)。文档调整提交 `e67b95ccd` 的 [Run 39818401407](https://github.com/mysStack/console/actions/runs/39818401407) 工具回归 32 项成功，阶段检查因 REA 完整 PR 差异含历史业务代码而失败；不放行 PR。

- 2026-10-24：通过固定 `origin/release-3.4` 补齐三类资源的设置分区和资源特有 Action 对照；当前 V4 仅 Deployment 接入简化设置 Modal，STS/DS 编辑设置仍调用 YAML。详见[旧源码与当前实现对照](./workload-settings-source-evidence-20261024.md)。此项只关闭结构未知，不代表 REA 通过。
- 2026-10-23：完成 Workload Store/API 的定向静态取证，绑定三类资源的作用域 URL、Deployment 原生设置 PUT、其他 PATCH、Background 删除、关联 HPA 和 StatefulSet Service PATCH；同时确认当前代码没有统一的 mutation 后 React Query 失效机制，DaemonSet 停止语义与旧源码不同，必须进入后续独立验证。详见[Store/API 取证](./workload-settings-source-evidence-20261024.md#storeapi作用域和缓存的定向取证2026-10-23)。本轮只补证据，不修改业务代码、不部署；该条是历史取证记录，当前阶段已按负责人批准进入 DEV。
- 2026-10-23：使用 `/home/bruce/.bashrc` 专用测试账号在 131 完成限定浏览器 REA。确认项目列表和三类详情页可渲染；Deployment“编辑设置”打开原生表单，StatefulSet 和 DaemonSet 的同名入口均实际打开“编辑 YAML”。当前部署镜像仍是旧 SHA，证据只用于 REA 校准，不计为当前分支 VERIFY。详见[运行时 REA](./workload-runtime-rea-20261023.md)。
- 2026-10-23：依据测试准入规则完成三类 Workload 的分层测试设计，复用现有表单、Store、作用域和配置引用回归资产，登记 API/Service Guard、稳定 UI、草稿流程和人工探索的 MVTests。131 已取得 admin 浏览器会话并完成限定 REA 页面观察，但当前部署制品不是当前分支 SHA，VERIFY 前置条件仍未满足；本文件只约束后续验证，不放行 DEV。详见[测试设计](./workload-test-design-20261023.md)和[运行时 REA](./workload-runtime-rea-20261023.md)。

## 2026-10-23 REA 补证与批准记录（历史结论保留）

- 复核范围：`module-execution.json`、组合能力矩阵、字段级 V3/V4 对照、Store/API 静态取证、运行时 REA、测试设计及当前 PR 门禁结果。
- 批准前技术复核结论：当时材料支持“已定位主要入口、部分字段和请求边界”，不支持“Deployment、StatefulSet、DaemonSet 已完成 REA”。三类资源的完整字段/默认值/校验、资源特有 Action、RBAC 与作用域、缓存失效、错误/取消路径和 V4 替代边界仍未闭环。当前 SHA 部署后浏览器行为属于后续 VERIFY，不能要求开发前已有最终实现的验收。
- 当前阶段已从 `REA` 进入 `DEV`，REA 结论为“已通过”；本次批准只解除编码门禁，不代表功能已完成，不部署 131，直到 DEV 交付完成并进入 VERIFY。该结论不是对功能不存在的判断，也不是对历史代码的否定。
- 不属于本轮 REA 结论的历史事实：已有单元测试、旧 SHA 131 浏览器记录和旧镜像结果只能作为输入，不能替代当前 SHA 的模块阶段证据；ConfigReference 当前测试还验证了 V3/Wujie 桥接的存在，不能作为桥接已移除的证明。
- 本轮使用 131 现有浏览器会话补充了集群级入口和旧 V3 设置页面证据：三个集群入口可渲染对应资源的 V3 嵌入列表（V4 仅为 Banner/Tab 外壳），但资源链接仍指向 `/consolev3`，并实际加载 `/dist/v3dist/*`；旧 V3 页面观察到 Deployment、StatefulSet、DaemonSet 各自的更新策略、容器/存储/调度/优雅终止等分区及资源差异。当前部署镜像为旧 SHA，证据只用于 REA 校准，不改变当前阶段或放行结论。详见[运行时 REA](./workload-runtime-rea-20261023.md#2026-10-23-集群级入口和旧-v3-设置复核)。

- 定向补证输入 `45f104b6e18215bb6b4f273e1dd16da30107188a`：当前 Bundle 的策略/调度/优雅终止三个工厂完成静态 REA，并捕获三类旧 V3 更新策略的浏览器 PUT，保留资源版本，模拟 409 后取消，三类资源 API 回读的 resourceVersion/spec 摘要前后均相同。新发现包括 DaemonSet 默认 20%/切回初始化 25% 不一致、数字输入仍为字符串，以及 StatefulSet 初始化分支的 `statfulsets` 拼写。详见[字段补证](./workload-v3-field-equivalence-20261023.md#当前编译制品的策略调度及优雅终止补证)和[请求记录](./evidence/workload-strategy-20261023-runtime.json)。未验证真实持久化、低权限 UI 或全部字段。
- 依据固定 `origin/release-3.4` 的行级复核补齐了旧 V3 的 Service 初始化、DaemonSet 无副本控件、Pod 安全/调度/宽限期/元数据分区、普通卷与 StatefulSet PVC 模板的关系。该证据关闭静态结构未知，不关闭当前 V4 字段写回、RBAC、缓存或浏览器等价性。
- 通过 Playwright 只读遍历 131 旧 V3 三类设置弹窗的全部 `data-name` 分区，已归档输入路径、已有值和资源差异；没有提交保存请求。结构化结果见[旧 V3 UI 快照](./evidence/workload-settings-ui-20261023.json)，不能替代当前 SHA VERIFY。
- 同一输入 SHA 的 PR #2 [Run 39859664115](https://github.com/mysStack/console/actions/runs/39859664115) 工具回归成功，阶段/范围检查失败；PR 仍为 Open/Draft，不合并。仅记录真实结果，不为消除红灯改写历史。
- 本次复核结论：REA 已获准进入 DEV，优先补齐容器/卷的保留与清空、StatefulSet Service/PVC 模板、DaemonSet Action 语义和低权限/缓存边界；已知实现缺口属于 DEV，最终部署浏览器验收属于 VERIFY，不混用阶段要求。

## 2026-10-22 编辑设置 REA 纠偏

- 已确认此前流程错误：原生 `WorkloadSettingsModal` 在完整 V3 行为矩阵和 REA 证据闭环前就开始实现，不能把已有浏览器场景通过等同于 V3 编辑设置完成。
- 已对当前 `v3dist` 的相关 bundle 执行定向 REA；分析结果为部分覆盖，仍有动态路径、语义图和运行时未知项。编辑设置状态降回“REA 分析中”，DEV/VERIFY 不得据此关闭缺口。
- 已保留现有提交、Worktree 和分支，不回写历史，不部署最终 `36ae2216` 制品。详见 [Workload 编辑设置 REA 复核](./workload-settings-rea-20261022.md)。

## 历史执行快照（不作为当前阶段放行）

以下内容保留各自提交、镜像和测试事实；“完成”仅指当时限定场景，不表示模块 REA 或完整验收通过。

### 2026-10-22 Deployment 编辑设置专项

- 负责人：当前 Codex 单会话；分支/Worktree 为登记的 `feature/v4-workloads` / `console-workloads`。
- 当时代码 SHA：`9587f2c543ff123bf4e033148cc16015a5ea4929`；本节之后的文档提交仅归档证据，不作为重新构建的应用代码。
- 已修复：编辑设置错误进入 YAML、projected 卷遗漏、字段清空/保留、并发 resourceVersion 丢失、失败无提示、滚动后提示在屏幕外。
- 本地 70 文件/287 项通过；相关 ESLint/Prettier/diff 检查通过；`build:packages` 在 `dec969432` 通过，最终生产构建由精确 SHA CI Run `39786947128` 完成。完整 TypeScript 仍有 1316 条既有诊断，不能记为通过。
- 最终镜像 tag `feature-v4-workloads-20261022-212830-9587f2c543ff`，digest `sha256:cf9e9d7f9400b273ca4711fa03c1d4668686ec42c2b0c6e9459d96b2034af923`；Pod `ks-console-69bbd8bd7-86wgh` Running/Ready、imageID 匹配，重启 0。
- 新登录后的 Playwright：原生保存、取消、刷新/返回/重开、原有 projected/headers/ownerReferences 保留、emptyDir 挂载、ConfigMap 前缀引用、实际 409、实际 422 后重试、网络失败可见提示通过；专用工作负载 Pod Ready，配置/挂载已在容器内检查。
- 本轮 UI 删除补测因 dialog 定位错误未执行，不计通过；资源已通过测试 owner 的 GC 清理，namespace 保留。
- 仍未验收：Secret/PVC/HostPath 等来源、全部探针和多容器组合、完整 RBAC/跨集群缓存、V3 设置编辑等价能力；Pod Watch `403` 及共享 request 网络异常处理继续单列。
- Workload 整体保持“开发中”，Draft PR #2 不合并。详见[专项 VERIFY](./deployment-settings-verify-20261022.md)。

### 2026-10-22 独立分支首次 131 VERIFY

- 当时记录阶段：当时已执行首轮限定验证，但缺少完整 REA 放行，不能认定阶段晋级成立；Workload 整体仍为“开发中”，没有进入 REVIEWED 或 INTEGRATED。
- 分支/Worktree：`feature/v4-workloads` / `/home/bruce/code/ks-develop/console-workloads`；当时代码 SHA `288fbccab63bebf76c3677beadc8b00c60c3cfd3`。
- Draft PR：[#2](https://github.com/mysStack/console/pull/2)，Head 与远程分支均为当前代码 SHA，目标为 `feature/v4-migration`。
- 本地验证：70 个测试文件、278 项通过；相关 ESLint 0 错误；Prettier、`git diff --check` 通过。
- CI/镜像：Run `39754337878` 成功；tag `feature-v4-workloads-20261022-171926-288fbccab63b`；index digest `sha256:52ef9ca542462c0404ef8e3ac2f44579c8df8bd3993d0d1c4a5ba6e2e8a44378`。
- 131：`ks-console` rollout 成功；Pod `ks-console-c9767f8f-bvdkg` 为 Running/Ready、重启 0，imageID 与 index digest 一致。
- 浏览器：Deployment、StatefulSet、DaemonSet 原生列表及 Deployment 六个详情页签通过直达、刷新、返回、namespace 隔离和无可见 iframe 检查；Revision 不再洪泛或触发 React `#185`；原生删除成功并由 API 确认资源已清理。
- 未关闭：Deployment 高级创建配置、全部 Action、完整 RBAC、Pod Watch WebSocket `403`、StatefulSet/DaemonSet 创建，以及后续 Pod、Job/CronJob 等 Workload 资源。
- 完整证据见[Workload 131 VERIFY 记录](./workload-131-verify-20261022.md)。

### 2026-10-22 独立分支开发恢复

- 负责人：当前 Codex 会话，无子 Agent。
- Worktree：`/home/bruce/code/ks-develop/console-workloads`；分支：`feature/v4-workloads`；PR 目标：`feature/v4-migration`。
- 当时记录阶段：`DEV`。项目级 Deployment、StatefulSet、DaemonSet 原生列表与详情、Workload Store 错误传播、项目作用域、列表刷新、Deployment 基础创建、多个工作容器、初始化容器、端口、普通环境变量及启动命令已迁入独立分支。
- 当时代码 HEAD：`aad2e9248`。相对迁移基线新增 17 个代码/测试提交；远程分支尚未推送这些提交，独立镜像、131 rollout 和 Playwright 验收仍待执行。
- 本地回归：`./scripts/test.sh` 为 67 个文件、273 项通过、0 失败；变更文件 ESLint 为 0 错误、16 个既有警告；Prettier 与 `git diff --check` 通过。
- 构建：`corepack yarn build:packages` 通过；使用 Worktree 自身按 `yarn.lock` 安装的依赖及 `NODE_OPTIONS=--openssl-legacy-provider` 后，`build:dll` 和 `build:prod` 通过。生产构建保留 4 个既有警告；`build:locales` 额外报告 ConfigHistory 西班牙语、繁体中文重复键，但命令退出 0，该问题不属于 Workload 改动，继续登记为质量风险。
- 首次 `build:packages` 暴露迁移基线缺少现代 Node 兼容修复，已迁入 `6376e818b`；该构建脚本为当前模块必需共享依赖，独立 PR 中必须明确标注，最终公共归属由集成评审决定。
- 共享改动：`packages/shared/src/components/Inputs/ArrayInput` 仅修复显式空数组与删除最后一行后的行为，调用方为 Deployment 容器、端口和环境变量编辑；已补 ArrayInput 自身回归。该变更最终归属仍需在独立 PR 评审时确认，不能扩张为公共底座已验收。
- 历史 `feature/v4-configmaps-secrets` 上的 CI、镜像和 131 浏览器证据只作为输入，不继承为本分支 VERIFY 证据。

### 2026-10-22 分支归属纠正

- 负责人：当前 Codex 会话，无子 Agent；本次处理 Git 分支归属，不进行新功能开发或部署。
- Worktree：`/home/bruce/code/ks-develop/console-workloads`；分支：`feature/v4-workloads`；核验基线：`3e09afd6a051d4091b3c887462c880eff2ba6754`。
- 原分支 `feature/v4-configmaps-secrets` / `9fa3c15b4`、Draft PR #1、既有三个 P0 Worktree 及所有提交保留。此前 P0 及模块记录仍在原分支，没有覆盖或删除。
- 当时记录状态：专用分支已建立，已逐项归集历史 Workload 代码和必要共享依赖；PR #1 的既有混合历史未改写，Workload 后续以独立分支和独立 PR 评审。
- 主计划的模块独立分支规则优先于此前将整个开发持续放在 ConfigMap/Secret 分支的执行记录，详见[纠正记录](./workload-branch-realignment-20261022.md)。
- 本分支尚未执行应用构建、部署或浏览器验收；旧分支单元测试、CI 和浏览器记录保留其原始版本，不直接继承通过结论。

# 当前状态补充（2026-10-24：StatefulSet/DaemonSet 详情页运行时 REA 对照）

- 当前负责人：Codex 单会话；分支 `feature/v4-workloads`；Worktree `/home/bruce/code/ks-develop/console-workloads`；未启动子 Agent。
- 本轮取证基线：`ffc2b27e785dff7518c5db7e5fb667e416080139`；只新增 REA 证据和记录，没有修改业务代码、没有构建和部署。
- 使用 131 同一集群 `host`、同一 namespace `v4-migration-e2e` 和已授权测试账号，对照 `release-4.1.5` 基线 `30881` 与当前 V4 `30880`，打开两个 StatefulSet 和两个 DaemonSet 详情页。四个资源的两套页面均 HTTP 200，页面均显示 `1/1` 和 Running Pod。
- 直接观察：StatefulSet 两边都有编辑服务、编辑设置、编辑 YAML、重新创建、删除；DaemonSet 两边都有编辑设置、编辑 YAML、重新创建、删除。当前 V4 三类页面均提供原生“配置引用”Tab，四类页面均未发现 `wujie-app`。
- 当前 V4 DaemonSet 资源、Pod、HPA 和监控读取请求返回 200；基线 DaemonSet 资源和 Pod 读取请求返回 200。证据见 [`StatefulSet/DaemonSet 详情页浏览器对照`](./evidence/workload-kind-detail-browser-20261024.json)，截图只保留在本地 `.playwright-cli/`。
- 未完成：表单字段保存回读、StatefulSet Service/PVC、DaemonSet 停止恢复、完整 Action、低权限 RBAC、namespace 缓存、错误路径和逐项 V3 等价。模块仍为 `REA / 分析中，待复核`，不进入 DEV。

# 当前状态补充（2026-10-24：编辑设置 Modal 样式差异已登记）

- 在 `v4-pvc-sts-7fa` 上完成基线 `30881` 与 V4 `30880` 的真实浏览器 Modal 对照。两边都能打开“编辑设置”，但基线是分区切换式 Modal，V4 是连续可滚动原生表单；导航命名、首屏字段范围和可见分区不同。
- 该结果说明当前 V4 采用功能边界重构，不能把布局差异直接写成“样式已等价”，也不能把打开 Modal 写成编辑行为已通过。字段默认值、校验、清空/保留、保存回读、Deployment/DaemonSet 差异仍需复核。
- 证据见 [`编辑设置 Modal 对照`](./evidence/workload-settings-modal-browser-20261024.json)，截图仅保留本地 `.playwright-cli/`。当前阶段保持 `REA / 分析中，待复核`，本轮未修改业务代码。

# 当前状态补充（2026-10-24：Deployment 编辑设置浏览器 REA 对照）

- 在 `Deployment/v4-deploy-edit-ef3` 上完成基线 `30881` 与 V4 `30880` 编辑设置 Modal 对照。两边均能打开编辑设置，均有滚动更新和 `25%/25%` 更新参数；基线按分区切换，V4 使用连续可滚动原生表单。
- 当前 V4 首屏还展示副本数量、终止宽限时间、标签和注解；其中 `kubectl.kubernetes.io/last-applied-configuration` 完整 JSON 会显示在表单中。本轮仅登记为需要确认的元数据展示风险，没有擅自修改。
- 证据见 [`Deployment 编辑设置浏览器对照`](./evidence/workload-deployment-settings-browser-20261024.json)，截图只保留本地 `.playwright-cli/`。未执行写操作，模块仍为 `REA / 分析中，待复核`。

# 当前状态补充（2026-10-24：静态 REA 测试取证）

- 当前源码的 6 个 Workload 相关测试文件已执行，共 85 项测试全部通过：创建/设置表单 81 项、更新策略 3 项、三类详情原生入口 3 项。
- 测试覆盖资源类型字段分支、更新策略、PVC 模板、元数据、调度、安全上下文、镜像凭据、环境引用和原生详情入口；不代表 131 当前部署制品已通过，也不关闭浏览器写回、RBAC、缓存、错误和逐项 V3 等价缺口。
- 证据见 [`Workload 静态 REA 测试`](./evidence/workload-static-rea-tests-20261024.json)。模块继续保持 `REA / 分析中，待复核`。

# 当前状态补充（2026-10-24：配置引用原生页面 REA）

- 当前 V4 已在 131 真实浏览器中打开 Deployment、StatefulSet、DaemonSet 三类配置引用页面，页面和只读请求均正常；ConfigMap/Secret 引用名称、前缀、生成环境变量摘要正常渲染，页面不展示 Secret 值。
- 本轮只完成读取和渲染检查，没有应用引用、没有修改资源。写回、缓存、RBAC、文件挂载、prefix、多容器、Reloader 和逐项 V3 等价仍未验证。
- 证据见 [`配置引用原生页面 REA`](./evidence/workload-config-reference-rea-browser-20261024.json)。模块继续保持 `REA / 分析中，待复核`。

# 当前状态补充（2026-10-24：Deployment 元数据页对照）

- 对照基线和当前 V4 的 Deployment 元数据页后确认：两边均显示相同标签和 `deployment.kubernetes.io/revision`、`kubectl.kubernetes.io/last-applied-configuration` 注解。
- 因此，当前 V4 编辑设置首屏展示 last-applied 注解属于信息组织差异，不再作为资源元数据来源不一致记录；是否在编辑设置中折叠仍需产品确认。
- 证据见 [`Deployment 元数据页对照`](./evidence/workload-metadata-browser-20261024.json)。字段写回、权限和错误路径未关闭，模块仍为 `REA / 分析中，待复核`。

# 当前状态补充（2026-10-24：配置引用查看摘要）

- Deployment 配置引用页中只读点击两个“查看”后，ConfigMap 仅显示键名 `APP_MODE`，Secret 仅显示键名 `TOKEN`，没有显示 Secret 值，也没有发出写请求。
- 该结果补强了配置引用脱敏证据；应用引用保存、回读、权限和缓存仍未验证，模块继续保持 `REA / 分析中，待复核`。

## 2026-10-24 配置引用静态测试补证

- 在 `feature/v4-workloads` 当前 HEAD `ca18a3958437bea6357de57abcc04af9fff6d4d0` 上执行 ConfigReference 目录 11 个现有测试文件，共 75 项全部通过。
- 本次只补充静态 REA 证据，没有修改业务代码、构建、部署或把模块阶段推进到 DEV。证据见 [`evidence/workload-config-reference-static-tests-20261024.json`](./evidence/workload-config-reference-static-tests-20261024.json)。
- 已验证：引用解析、prefix/键名预览、环境变量摘要、ConfigMap/Secret 文件挂载写回、Reloader 注解、原生编辑提交防重复、错误重试和配置引用路由约束。
- 未验证：当前分支制品浏览器写回与回读、低权限 RBAC、namespace 缓存隔离、错误路径和逐项 V3 功能等价。模块仍为 `REA / 分析中，待复核`。

## 2026-10-24 基线浏览器重新登录结果

- 本轮尝试重新打开 131 `release-4.1.5` 基线入口 `30881` 的 Workload 环境变量页面时，使用专用测试账号环境变量登录，页面返回“用户名或密码不正确”。
- 本次未继续采集页面、请求或写操作证据，也没有把登录失败当作 V4 功能结论；此前已经提交的成功浏览器取证保持原始身份和结论不变。
- 后续需要在测试账号可用后重新执行基线与当前 V4 的浏览器对照；在此之前，新增浏览器验证状态为“未完成”，模块仍为 `REA / 分析中，待复核`。

## 2026-10-24 Workload 定向静态测试补证

- 在 `feature/v4-workloads` 当前 HEAD `1b505477e96cab4999065ce63683f0f3c69a7223` 上执行 34 个 Workload 相关现有测试文件，共 211 项全部通过。
- 本次没有修改业务代码、构建、部署或推进模块阶段。证据见 [`evidence/workload-rea-targeted-tests-20261024.json`](./evidence/workload-rea-targeted-tests-20261024.json)。
- 已验证静态范围：配置引用、设置表单、Deployment/StatefulSet/DaemonSet 资源类型分支、原生详情入口和 Action。
- 未验证：当前 SHA 部署制品的浏览器写回、API 回读、低权限 RBAC、namespace 缓存隔离、错误路径和完整 V3 功能等价。模块仍为 `REA / 分析中，待复核`。

## 2026-10-24 Action/API 静态记录纠偏

- 复核并修正旧 Action/API/RBAC 文档中的过时结论：当前 Deployment、StatefulSet、DaemonSet 项目详情均通过原始资源读取打开原生 `WorkloadSettingsModal`，YAML 是独立 Action。
- 当前 ConfigReference 生产入口静态测试未发现 `useV3action`、Wujie 或 `consolev3` 调用；集群级三类 Workload 主路由已切换原生，其他集群级 Embed 和全局 Wujie 按需注册仍不能合并判断。
- 本次只修正 REA 记录，没有修改业务代码；三类资源的运行时字段、API 写回、RBAC、缓存、错误和逐项 V3 等价仍未验证，模块保持 `REA / 分析中，待复核`。

## 历史尝试（2026-10-24：131 浏览器登录边界核对）

- 只读确认 `default` context、131 API Server、V4 `30880`、V3 对比前端 `30881` 和两个前端 Deployment 的 `1/1 Ready` 状态。
- 浏览器登录读取 `/home/bruce/.bashrc` 中的 `KS_TEST_USERNAME`、`KS_TEST_PASSWORD`；原尝试未将未 export 的用户名传入浏览器子进程，页面返回 `Incorrect username or password`。
- 本轮没有修改集群用户、密码、角色或任何测试资源，也没有进入 Workload 页面；原始证据见 [`evidence/workload-browser-login-rea-20261024.json`](./evidence/workload-browser-login-rea-20261024.json)，不能据此判断账号无效。

## 2026-10-24 131 浏览器登录环境变量继承补正

- 复核确认 `.bashrc` 中 `KS_TEST_USERNAME` 在 shell 中有值但未 export，`KS_TEST_PASSWORD` 已 export；浏览器启动前在同一 shell 显式 export 已有用户名变量后，V4 `30880` 新浏览器上下文成功登录并进入 `/dashboard`，用户角色为 `platform-admin`。
- 本次仅验证登录链路，没有执行资源写操作；实际部署制品源提交为 `31b6d88fc7e87707776c094aee12f1cdcb02604b`，不是当前工作区 HEAD。证据见 [`evidence/workload-browser-login-exported-shell-20261024.json`](./evidence/workload-browser-login-exported-shell-20261024.json)。
- 登录配置阻塞已解除；当前 HEAD 的构建、部署、Workload 页面浏览器验收、RBAC、缓存、错误和逐项 V3 等价仍未闭环，模块继续保持 `REA / 分析中，待复核`。

## 2026-10-24 Workload 原生列表浏览器 REA 补证

- 在已认证浏览器中直达 `test-workspace / host / v4-migration-e2e` 的 Deployment、StatefulSet、DaemonSet 项目列表，三类页面均渲染 2 条资源，类型切换、搜索、刷新、定制内容、创建入口和分页控件均可见。
- 三类列表读取请求均返回 200，namespace 作用域均为 `v4-migration-e2e`；本轮没有执行任何写操作。证据见 [`evidence/workload-native-list-browser-rea-20261024.json`](./evidence/workload-native-list-browser-rea-20261024.json)。
- 控制台仍记录已知扩展初始化错误和 Wujie 警告，未观察到 Workload 列表自身错误；扩展问题继续单独跟踪。当前证据来自旧于工作区 HEAD 的已部署制品，不能直接继承为 VERIFY；模块仍为 `REA / 分析中，待复核`。

## 2026-10-24 Workload 原生详情浏览器 REA 补证

- Deployment、StatefulSet、DaemonSet 三类专用资源详情页均可直达并渲染，详情入口包含资源状态、元数据、环境变量、配置引用和事件。
- Deployment 的“更多操作”展示回退、自动扩缩、编辑设置、编辑 YAML、重新创建和删除；只读打开“编辑设置”后观察到更新策略、容器组设置、存储、调度、终止宽限和元数据分区，取消关闭，没有产生写请求。
- 证据见 [`evidence/workload-native-detail-browser-rea-20261024.json`](./evidence/workload-native-detail-browser-rea-20261024.json)。当前证据来自已部署旧于工作区 HEAD 的制品，不能直接标记 VERIFY；保存回读、全部 Action、RBAC、缓存、错误和逐项 V3 等价仍未闭环。

## 2026-10-24 当前 HEAD 静态 REA 测试重跑

- 当前 HEAD `d7cf426843f928e8a4458784d4800f862877477e` 上执行 34 个 Workload 定向测试文件，共 211/211 通过；集群级三类原生入口测试 6/6 通过。
- 本轮没有修改业务代码、构建或部署；证据已重新绑定当前 HEAD。测试结果只覆盖静态逻辑，不能替代当前 SHA 的浏览器写回、RBAC、缓存、错误和 V3 等价验证，模块仍为 `REA / 分析中，待复核`。

## 2026-10-24 集群级三类 Workload 原生入口补证

- 当前 HEAD `d78cab185f66beaebe16c03c3b3a09518c748cc8` 上执行 `packages/console/src/pages/clusters/containers/ApplicationWorkloads/nativeWorkloads.test.ts`，6 项全部通过。
- 测试确认集群级 Deployment、StatefulSet、DaemonSet 主路由已使用原生列表，保留 namespace 选择，并按所选 namespace 使用对应 Store 创建资源。
- 该结果只证明源码主路由静态行为；当前源码 `wujie.ts` 已无 `preloadApp()` 调用，但当前 HEAD 尚未完成本轮部署后的 Network 复验；其他集群级 Embed、当前制品浏览器、RBAC、缓存、错误和逐项 V3 等价仍未闭环。模块保持 `REA / 分析中，待复核`。证据见 [`evidence/workload-cluster-native-static-tests-20261024.json`](./evidence/workload-cluster-native-static-tests-20261024.json)。

## 2026-10-24 当前 HEAD 重跑定向测试

在当前 HEAD `8d561743f22586f23ff75f70a2fad43f8c33e42a` 上重新执行 34 个 Workload 定向测试文件，共 211/211 通过；另外执行集群级三类 Workload 原生入口测试，共 6/6 通过。此次重跑没有修改业务代码、没有构建、没有部署，仅更新证据绑定到当前 HEAD。

证据见 [`Workload 定向静态测试`](./evidence/workload-rea-targeted-tests-20261024.json) 和 [`集群级原生入口静态测试`](./evidence/workload-cluster-native-static-tests-20261024.json)。这些结果仍不能替代当前制品浏览器、RBAC、缓存、错误和逐项 V3 等价验证；模块保持 `REA / 分析中，待复核`。
