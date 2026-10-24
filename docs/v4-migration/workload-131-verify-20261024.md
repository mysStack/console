# 当前增量：已有登录态复验三类批量删除，登录门禁仍未闭环（2026-10-24）

在新制品 `feature-v4-workloads-20261024-080405-766db6764e05` 上，新浏览器 context 登录仍返回 `Incorrect username or password`，因此正常登录条件未通过；按规则本轮部署最终已回滚。回滚前，使用已存在的登录态 Playwright session 进入新制品页面完成三类批量删除：Deployment 两个本体删除，StatefulSet 两个本体及各自登记的 Headless Service 删除，DaemonSet 两个本体删除；DaemonSet 两次 DELETE 请求记录为 200 OK，其余结果由 Kubernetes API 复核资源不存在。

这证明本次 `annotations` 传递修复在已有登录态下覆盖了页面批量删除及 StatefulSet 关联 Service 清理路径，但不能替代新制品的正常登录验证，也不能将页面上的 8 个 Console error、4 个 warning 解释为零错误。扩展/监控相关错误仍按既定范围独立跟踪。证据见 [批量删除制品部署与登录证据](./evidence/workload-batch-delete-deploy-login-20261024.json)。Workload 继续保持 `VERIFY / 未完成`。

# 当前增量：新制品登录失败，已回滚（2026-10-24）

批量删除修复制品 `766db6764e052ade7236da411fedc435303d1cc8` 已通过部署门禁并部署到 131，CI Run `40042970738`、镜像 `feature-v4-workloads-20261024-080405-766db6764e05`、digest `sha256:32a8c980510d13e63e6e47cbe7d52c29f64ad728b8fd19c190e6ac4e499f2dd4` 与 Pod imageID 一致，rollout 和 Pod Ready 通过。

使用新浏览器 context 和专用测试账号登录时，登录页返回 `Incorrect username or password`，未进入 Workload 页面，因此没有执行或记录批量删除浏览器结果。按部署验证规则已停止本轮验证，并恢复到部署前精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` / digest `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76`；回滚 rollout、Pod Ready 和实际 imageID 通过。证据见 [批量删除制品部署与登录证据](./evidence/workload-batch-delete-deploy-login-20261024.json)。

登录失败尚不能归因于本次代码变更或测试账号状态，批量删除修复仍需在可登录条件恢复后，用同一精确制品重新部署并完成三类资源及 StatefulSet 关联 Service 的浏览器复验。模块继续保持 `VERIFY / 未完成`。

# 历史记录：批量删除修复已构建（后续已部署并因登录失败回滚）（2026-10-24）

批量删除参数修复已提交于 `9a5bd5cdc22ec7877c33773ca1ba8562a463bcd6`。本地 `./scripts/test.sh` 通过 91 个测试文件、402 项测试，`corepack yarn build:packages` 通过；CI Run `40042145365` 成功，精确制品为 `feature-v4-workloads-20261024-075502-9a5bd5cdc22e`，镜像 digest 为 `sha256:cb4e48ff69f11fe829586f5134c0de24831895a46f558f2fdf9f85a1a19861f0`。

该段记录形成时尚未将该新制品部署到 131；随后已完成一次精确部署，但因浏览器登录失败按规则回滚。StatefulSet 关联 Service、Deployment/StatefulSet/DaemonSet 批量删除成功路径仍未在可登录的新制品上复验；模块保持 `VERIFY / 未完成`。

# 当前增量：批量删除关联资源缺陷，退回 DEV（2026-10-24）

在精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 上使用浏览器真实执行集群级批量删除，发现 StatefulSet 本体删除后，带 `kubesphere.io/related-service` 标注的 Headless Service 仍然存在。根因是 `packages/shared/src/hooks/useCommonActions/index.tsx` 组装批量删除参数时丢弃了每个资源的 `annotations`，导致 Workload Store 无法执行关联 Service/HPA 清理。证据见 [批量删除缺陷取证](./evidence/workload-batch-delete-defect-20261024.json)。

本轮已补充最小修复：由独立参数转换函数保留 `namespace`、`name` 和 `annotations`，并增加回归测试。模块阶段退回 `DEV`；待新提交完成本地测试、CI 构建、131 精确制品部署及三类资源浏览器批量删除和关联资源清理复验后，才能重新进入 `VERIFY`。旧制品的批量删除结果不继承为新制品通过。

# 当前增量：Deployment 回退实际写入复验（2026-10-24）

在精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 上，对专用 Deployment `v4-deploy-edit-ef3` 先写入临时模板注解以生成可回退修订，再通过浏览器打开回退弹窗选择 `#27`。实际 PATCH 返回 200，弹窗关闭；Kubernetes 随后成功 rollout，Ready 副本为 1，临时注解已移除，回退动作生成新的修订记录。

证据：[Deployment 回退浏览器复验](./evidence/workload-rollback-browser-verify-20261024.json)。本证据仅覆盖 Deployment 回退写入和恢复，不代表 StatefulSet/DaemonSet 具备同一回退入口，也不关闭批量删除、伸缩确认、完整错误/缓存和逐项 V3 等价缺口。

# 当前增量：集群级三类原生列表浏览器复验（2026-10-24）

在精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5`、镜像 digest `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76` 上，使用零 Cookie 新浏览器 context 登录 131，访问 `/clusters/host/deployments`、`/clusters/host/statefulsets` 和 `/clusters/host/daemonsets`。三类页面的专用 fixture 均可见，namespace 控件渲染，登录 HTTP 200、认证界面正常，页面错误为 0，Network 未发现 `/consolev3` 或 `/dist/v3dist` 请求。

本轮只证明集群级原生列表入口的页面渲染和基础作用域控件；不扩大为批量删除、完整 Action、缓存、RBAC 或逐项 V3 等价通过。证据：[集群级原生列表浏览器复验](./evidence/workload-cluster-native-browser-verify-20261024.json)。批量删除专用 fixture 已清理；该路径的确认弹窗要求输入资源名称，后续浏览器会话异常关闭，成功删除仍未验证。

# Workload 131 专项 VERIFY（2026-10-24）

## 当前 HEAD 三类原生设置入口复验（2026-10-24）

源码提交 `31b6d88fc7e87707776c094aee12f1cdcb02604b`（之后仅有记录提交）的 CI Run `40048500939`、镜像 tag `feature-v4-workloads-20261024-091102-31b6d88fc7e8`、digest `sha256:2956710cd7ef2fbda79ff7a0a9695dac466336bd08248784d5afdfb577b951d3` 和 131 Pod imageID 一致，rollout/Ready 通过。使用已有认证态在当前制品验证三类详情的“更多操作 → 编辑设置”：三个入口均打开原生 `WorkloadSettingsModal`，StatefulSet 显示 PVC 模板与容器组调度规则，DaemonSet 不显示不适用的副本数和调度规则；“编辑 YAML”是独立菜单项，没有把编辑设置跳转到 YAML。

本轮又在三个资源上执行终止宽限期 `30 → 31 → 30`，保存请求成功并由 Kubernetes API 回读为 `30`。另起零 Cookie 新 context 登录当前制品仍返回账号或密码错误，未进入工作负载页面。页面 Console error 数为 Deployment 8、StatefulSet 10、DaemonSet 8；完整字段等价、RBAC、缓存及错误矩阵尚未执行，因此只能关闭“入口仍跳转 YAML”和一个字段保存场景，不能标记三类 Workload 或编辑设置功能验收通过。结构化证据见[当前 HEAD 原生设置复验](./evidence/workload-native-settings-current-head-20261024.json)。

## 当前 HEAD 制品部署未完成（2026-10-24）

当前 HEAD `ae500da86a559b378ba7255ee1d21c3d95a3a768` 的 CI Run `40046932193` 成功，镜像 tag 为 `feature-v4-workloads-20261024-085149-ae500da86a55`，digest 为 `sha256:325f455ab8388f65ab1da254a4ca17d298baa45a118d38b12969c64db175bef5`。部署到 131 后新 Pod 长时间处于 `ContainerCreating`，没有形成可用于浏览器验收的 Ready Pod，已回滚到旧精确制品 `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76`；回滚 rollout、Pod Ready 和 imageID 通过。当前 HEAD 的浏览器验收未执行，不能标记通过。结构化记录见[当前 HEAD 制品部署证据](./evidence/workload-current-head-deploy-pull-20261024.json)。

## 编辑设置入口版本校准（2026-10-24）

在回滚前旧精确制品的已有认证态中重新打开 StatefulSet `v4-pvc-sts-7fa` 和 DaemonSet `v4-stop-ds-7fa` 的“更多操作 → 编辑设置”：两个入口均打开原生设置弹窗，分别显示资源适用的更新策略、容器组、存储、调度或元数据分区；“编辑 YAML”是单独菜单项。历史 REA 中将两个入口写成仍打开 YAML 的描述已过时，不能继续作为当前实现结论。该观察来自旧制品，当前 HEAD 尚缺部署后浏览器证据，详见[入口校准证据](./evidence/workload-native-settings-old-artifact-20261024.json)。

## 当前增量：配置引用与 Action 浏览器复验（2026-10-24）

在精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5`、镜像 digest `sha256:691f53f4527948a793326cd31525ed013b4edb285119e9680f59de52e1b1ed76` 上，使用零 Cookie 新浏览器 context 登录 131，完成三类 Workload 的配置引用和 Action 复验，登录 HTTP 200、认证界面正常，未记录页面错误。

- 配置引用：Deployment、StatefulSet、DaemonSet 均完成 ConfigMap 引用保存、刷新回填、取消不保存、受控 500 错误提示、失败写入不改变资源和恢复；三类保存请求均返回 200，测试值未写入证据。
- 详情 Action：三类页面均渲染当前实现范围内的编辑信息、回退、YAML、重新创建、删除；Deployment/StatefulSet 还显示自动扩缩，StatefulSet 显示 Service。回退、自动扩缩、重新创建、删除的取消路径已逐项验证；Deployment 回退确认后的实际写入另有独立证据。
- 重新创建：三类资源实际 PATCH 返回 200，`kubesphere.io/restartedAt` 改变并回读成功。
- DaemonSet 批量停止：选中专用 fixture 后确认，PATCH 返回 200，`non-existing=true` 节点选择补丁生效；随后移除该测试补丁并确认恢复为 1/1 Ready。

证据：[配置引用浏览器复验](./evidence/workload-config-reference-browser-verify-20261024.json)、[Action 浏览器复验](./evidence/workload-action-browser-verify-20261024.json)。批量删除成功路径、伸缩确认后的实际 HPA/副本结果和完整错误/网络失败矩阵仍未验证；批量删除与伸缩确认时浏览器会话异常关闭，专用资源已清理，不能将其记为通过。因此本轮不能标记模块验收通过。

## 当前增量：低权限 RBAC 在精确制品上复验（2026-10-24）

使用专用 viewer 账号 `v4-workload-viewer-20261023` 在当前精确制品上完成三类配置引用页复验。账号可读取当前 `v4-migration-e2e` namespace 的 Deployment、StatefulSet、DaemonSet，三类更新请求均返回 403；回读的 resourceVersion 和 envFrom 未发生变化。`kubectl auth can-i` 同样确认该账号拥有 get、list、watch，不拥有 update，且对 `default` namespace 不具备 get 权限。

本轮证明低权限拒绝路径和当前资源保护有效；第二 namespace fixture 的 get/list 正反隔离也已完成，第一 namespace 列表不包含第二 namespace 资源，临时 Deployment 已清理、namespace 保留。证据：[Workload 低权限与 namespace 复验](./evidence/workload-rbac-namespace-verify-20261024.json)。

## 当前增量：全局 V3 预加载关闭，三类原生路由复验通过（2026-10-24）

精确制品 `24c6afa03849d5d5c7b84fccd1602639b1fd0eb5` 已在 131 完成部署。Deployment、StatefulSet、DaemonSet 均在零 Cookie 新 context 中登录成功，列表/详情直达、刷新、浏览器返回、专用 namespace API 作用域和设置页面渲染通过；三类页面 Network 均未观察到 `/consolev3` 或 `/dist/v3dist` 请求，页面错误为 0。

三类编辑设置均完成当前实现范围内的保存、刷新回填、外层取消、草稿丢弃、容器二级确认不提前写 API、镜像搜索入口显示和恢复。Deployment 恢复先收到预期的并发 `409`，随后使用非破坏性合并回写恢复成功；该结果记录为并发保护路径通过。

制品与部署证据：[当前 Workload V3 预加载关闭验证](./evidence/workload-v3-preload-verify-20261024.json)。本轮关闭的是共享启动层全局预加载缺口，不代表三类 Workload 的全部 Action、完整低权限 RBAC、缓存失效和逐项 V3 等价性已经验收。

## 当前增量：首次预加载修复未闭环，退回 DEV（2026-10-24）

对 `88b587f947ca9da929821eb372331eb8785db2ed` 精确制品的复验发现：登录后的 dashboard 预加载可能在首次进入 Deployment 页面时延迟完成，仍产生 `/dist/v3dist/main.*.css` 请求。此前按当前 `pathname` 跳过预加载的修复只覆盖了进入 Workload 路由后的调用，不能覆盖登录后初始 dashboard 的异步请求。

该事实已写入阶段记录，模块从 VERIFY 退回 DEV。下一次修复将移除共享初始化层的全局 `preloadApp()`，保留 `setupApp()`，然后重新执行本地测试、构建、CI、部署和三类页面 Network 验证。

## 当前增量：原生 Workload 路由仍触发 V3 预加载（2026-10-24）

在精确制品 `8220090837bf9fe1e924578cc3bfc9e3115608ac` 对应的 131 部署上，使用零初始 Cookie 的新浏览器 context 登录，并逐一访问 Deployment、StatefulSet、DaemonSet 专用详情路由。三类页面均渲染了原生 V4 设置界面，直达、刷新、返回和 namespace API 作用域检查通过；但 Network 仍观察到 `/consolev3/dashboard` 以及 `/dist/v3dist/*` 请求。

根因已定位：`packages/core/src/run.tsx` 启动时无条件调用 `initWujie()`，`packages/core/src/utils/wujie.ts` 随后无条件执行两个 `preloadApp()`。这不是 Workload 详情组件主动嵌入 V3，而是共享启动层的全局预加载。当前页面没有可见 iframe，不能作为运行时无 V3 的证明。

结构化证据：[Workload 原生路由 V3 预加载复现](./evidence/workload-native-v3-preload-20261024.json)。由于该问题属于代码缺口，模块阶段从 VERIFY 退回 DEV；先补“原生 Workload 路由不预加载 V3、旧 V3 入口仍可按需加载”的回归测试和最小修复，再重新构建、部署和浏览器验收。

## 当前增量部署与登录阻塞（02:29 上海时间）

本节是当前状态，以下 `ef3b4f1a8` 专项成功结果保留其历史制品边界，不能直接继承给新代码。

- DEV 源提交 `3e1d40eae023cf54905e9c298f1ddd387ab2a98a`；构建提交 `3d255eaf85065d3e156dd7f6b8551e9557b6bcbc`。
- [CI Run 40000821377](https://github.com/mysStack/console/actions/runs/40000821377) 已成功，检出 SHA 一致；单元测试 89 文件、400 项通过，镜像构建/推送成功。本地 `build:packages`、`build:locales`、定向 ESLint/Prettier、`git diff --check` 通过；全项目 TypeScript 仍有 1326 条诊断，不记为通过。
- 测试镜像 `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261024-020955-3d255eaf8506`；index digest `sha256:d196181c25f1519f29ccc56b640c914c3b692440bbb0917a43636db925894ce4`。amd64 manifest `sha256:41a78f55cf1bc50afe3132c35c49b416ddcdc1e9b3be7c4a8737b53fed814e60`，两种身份分别记录，不混用。
- 部署门禁通过后实际更新 131 `kubesphere-system/ks-console`，rollout 成功；Pod `ks-console-585485888-wttmv` Running/Ready，实际 imageID 后缀与上述 index digest 一致。
- 浏览器使用零初始 Cookie 的新 context。首次登录脚本误用 `input[type=text]`，而页面用户名输入没有该属性，填写阶段超时；按授权要求立即恢复部署前镜像。此处是测试脚本失败，不能声称新镜像发生登录回归。
- 修正实际 placeholder 选择器及沙箱中不可用的 `URL` 构造调用后，使用 `/home/bruce/.bashrc` 的专用账号在**已回滚旧镜像**登录：HTTP 200，但 JSON `success=false`、业务状态 400、`INCORRECT_USERNAME_OR_PASSWORD`；Console 后端日志匹配 `invalid_grant`。不能只凭 HTTP 200 认定登录通过。停止重复尝试，不输出账号、密码、Cookie 或原始登录响应。
- 回滚后再次 `rollout status --timeout=30s` 成功，副本 1/1；当前 Pod `ks-console-98567fbfb-sr997` Running/Ready，实际 imageID `ghcr.io/mysstack/ks-console@sha256:d78e6edd76bd691345af0c10e865b1f1d97fabcdf4948e521b12ee50603be9c3`，登录页 HTTP 200。**认证登录恢复未验证通过**，当前运行的是旧 `ef3b4f1a8` 镜像。
- 当前未执行：新镜像三类设置渲染/保存/取消、镜像搜索正向、环境引用、权限修复、完整 namespace/RBAC 与其他等价性复验。已请求负责人在本机核对专用测试凭据；有效登录恢复后，重跑部署门禁、重新部署同一构建制品并从新 context 验收。尚无证据需要因本次认证拒绝修改 Workload 业务代码。

结构化证据：[当前构建/部署/回滚](./evidence/workload-settings-verify-attempt-20261024.json)。未修改三类 fixture、未清理既有生成物、未合并 PR #2，阶段保持 `VERIFY / 未完成`。

## 制品身份和范围

- Git SHA：`ef3b4f1a83c3b708f5a12b35dd178bf358c99b8d`；DEV 源提交 `f6b7c689b55b1561d474dcb6dc056a39e2166e51`。
- CI Run：[39941312750](https://github.com/mysStack/console/actions/runs/39941312750)，结论 success，检出 SHA 一致。
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-workloads-20261023-184640-ef3b4f1a83c3`。
- digest / 实际 Pod imageID 后缀：`sha256:d78e6edd76bd691345af0c10e865b1f1d97fabcdf4948e521b12ee50603be9c3`。
- 131 `kubesphere-system/ks-console` 副本 1/1，Pod `ks-console-98567fbfb-f9qkb` Running/Ready。
- 专用 namespace `v4-migration-e2e`；未删除 namespace，未修改业务数据。

## 实际浏览器专项结果

| 场景           | Deployment   | StatefulSet        | DaemonSet          | 证据边界                                                                                            |
| -------------- | ------------ | ------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| 原生编辑设置   | 通过         | 通过               | 通过               | 优雅终止 30→31、PUT 200、API 回读、刷新回填、修改后取消不保存、恢复 30；镜像/引用/节点选择/PVC 保留 |
| ConfigMap 引用 | 通过         | 通过               | 通过               | 前缀保存 PATCH 200、刷新回填、取消不保存、恢复初值                                                  |
| Secret 引用    | 通过引用共存 | 未独立验证         | 未独立验证         | 不输出 Secret 值，不扩大为三类全覆盖                                                                |
| 保存失败       | 通过受控失败 | 通过受控失败       | 通过受控失败       | Playwright 拦截 PATCH 返回 500，提示可见、API 未改变；不是实际 API Server 故障                      |
| PVC 本地化     | 不适用       | 通过               | 不适用             | 创建区标题、添加按钮和非法输入校验显示中文，不显示原始键                                            |
| 低权限引用页   | 发现缺陷     | 同一共享面板待复验 | 同一共享面板待复验 | Deployment 实际登录后仍可编辑；点击应用实际 PATCH 403，服务端未改变                                 |

可重跑脚本：[设置持久化](./evidence/workload-settings-browser-20261024.js.txt)、[引用持久化](./evidence/workload-config-reference-browser-20261024.js.txt)。脚本仅针对登记 fixture，应先核对资源身份和当前制品再运行。所用资源：`v4-deploy-edit-ef3`、`v4-pvc-sts-7fa`、`v4-stop-ds-7fa`，引用 `v4-cfg-ref-ef3` / `v4-sec-ref-ef3`。

低权限实测时间 `2026-10-23T16:17:49.924Z`（上海 2026-10-24 00:17），账号为已有专用 viewer；未新增权限。其 Deployment PATCH 为 403，GET 为 200，操作前后 resourceVersion 均为 `135946818`，envFrom 仅含以上两个引用名称且未改变，页面显示“配置引用保存失败。”。

## 缺陷处理与剩余条件

根因：`ConfigReferencePanel.tsx` 没有调用项目/namespace 范围的 `hasPermission`，编辑控件和保存回调缺少 edit 权限判断；详情主操作已正常按权限过滤。修复只作用于普通三类 Workload 引用面板，保留容器切换、只读预览和返回，不改变全局鉴权工具或其他模块。

模块退回 DEV，REA 批准保留；先补组件权限回归，修复后再进入 VERIFY，构建新 SHA 镜像并重新部署浏览器验证。此记录不表示三个模块已验收：完整 RBAC、跨 namespace 正反隔离、所有高级字段和 Action 逐项等价仍需完成。全局遗留扩展初始化错误独立跟踪；不将受控 500 及旧镜像证据充当当前全部成功。

## 负责人指出编辑设置版本/能力不符后的纠偏

本轮确认：131 已部署制品与 ef3b4f1a8 一致；这只能排除本次部署 SHA 不一致，不能证明编辑设置符合当前 V3 行为。之前只验证优雅终止字段保存/回填，却没有把完整编辑界面与当前 V3 逐项比较，遗漏了实际能力差异。

2026-10-24 上海时间约 00:22，在同一 131、同一专用 Deployment `v4-deploy-edit-ef3` 上只读打开 `/consolev3/clusters/host/projects/v4-migration-e2e/deployments/v4-deploy-edit-ef3/resource-status` 的编辑设置，实际观察：

- 左侧独立分区为更新策略、容器、存储、容器组调度规则、容器组优雅终止；容器通过卡片进入二级编辑。
- 容器编辑页提供 Docker Hub/私有镜像服务提示、容器类型、CPU/内存预留及上限、GPU 类型（NVIDIA GPU）与 GPU 上限、应用层端口协议、环境变量类型等。
- 原生 `WorkloadSettingsModal` 为单页长表单；`ContainerInput` 镜像为普通文本输入，资源只编辑 CPU/内存四项，端口仅 TCP/UDP/SCTP，环境变量仅名称/文本值与 envFrom。不能把未编辑字段保留当作这些交互已迁移。
- V3 页面存在 `input[name="gpu.value"]`，当前原生表单不存在对应 GPU 编辑控件；当前 v3dist 的 `1.9ca3a76d71946712055c.js` 也含 GPU 选择和 imagePullSecrets 处理。此处是当前制品/真实页面差异，不是依靠 release-3.4 推断。

尚不能给出当前制品对应的完整原始源码版本号，也不能把所有差异统一归因于某个旧版本。旧 `release-3.4` 仅作参考；应以当前固定 v3dist tree `1e499d92e11374e26c76f5e13be45251602bd596` 和真实 V3 设置页为准。

优先级调整：先按 DS-01（界面分区）、DS-04（镜像选择/认证）、DS-07（环境引用）、DS-09（资源/设备）、端口协议补齐当前制品对照与原生缺口，再继续全面验收。配置引用 RBAC 作为已确认缺陷保留，不取代完整设置等价主线。本次没有提交 V3 保存请求、没有修改业务功能代码、没有部署新镜像；此前专项成功结论仅限所列场景。
