# Workload 模块任务状态

## 唯一当前状态（2026-10-24）

- 负责人：当前 Codex 单会话，无子 Agent；能力 `deployment-statefulset-daemonset`。
- 分支 / Worktree：`feature/v4-workloads` / `console-workloads`；已验证镜像 SHA `ef3b4f1a83c3b708f5a12b35dd178bf358c99b8d`。
- 当前阶段 `DEV`，REA 已通过；因编辑设置完整能力未对齐当前 V3（分区、镜像选择、GPU、环境引用、端口协议）及低权限引用控件暴露，VERIFY 退回 DEV 修复，未标记已验收。
- 已完成当前镜像三类原生设置保存/API 持久化/刷新/取消/恢复、ConfigMap 引用保存与受控 500 错误反馈，以及 StatefulSet PVC 本地化复验。Deployment Secret 共存已验证，另外两类未独立验证 Secret 引用。
- 实际 viewer 点击应用为 PATCH 403，resourceVersion 与引用均未改变；下一项优先补齐当前制品编辑设置差异与原生功能；引用 edit 权限缺陷同时保留，修复后重新部署验证管理员及 viewer。
- 2026-10-24 DEV 增量：镜像凭据/GPU/协议代码已在 `b84c26590` 提交；本次补原生设置分区和容器二级编辑，组件确认/取消/校验及三类字段保留用例通过。84 文件/375 项回归通过；仍处 DEV，尚未部署/浏览器验收。设置分区代码已提交 `dd2e51c6d`；配置引用 RBAC 已补本地修复与三类回归，真实账号/当前 SHA 浏览器复验仍待执行。DS-07/08 已补 valueFrom 回填、切换、修改、删除和 optional，86 文件/383 项回归通过；环境引用代码已提交 `49967289d`；key 下拉和切换作用域隐藏旧选项已补本地修复，87 文件/386 项回归通过。镜像完整交互及当前 SHA 部署后验证仍待完成。见 [增量记录](./workload-settings-dev-20261023.md#设置分区与容器二级编辑2026-10-24dev-增量)。
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
