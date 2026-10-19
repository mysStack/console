# P0 任务状态

> 任务启动日期：2026-10-17（上海时间）  
> 协调工作区：`/home/bruce/code/ks-develop/console`  
> 项目计划基准：[KubeSphere Console V3 → V4 全量原生化迁移计划](../../../console-v4-migration-plan.md)  
> 本轮范围：继续维护 P0 全局风险，同时按模块门禁推进已具备依据的 V4 收尾工作；不把模块开发结果写成 P0 全局通过。

当前执行模式：**单 Codex 会话 + Git Worktree + 顺序执行**。项目已停止使用 Multi-Agent 和子 Agent；已有三个 P0 Worktree、分支、提交和历史证据继续保留。需要独立完成的人工或其他复核仍保持未完成，不因当前会话的静态核验自动关闭。

## 协作规则

- 三个 P0 任务从 `origin/feature/v4-migration` 的核验基线创建的独立 Worktree 和任务分支继续保留。
- 当前只由协调 Codex 会话顺序处理一个独立任务；每项先在对应 Worktree 完成、验证并提交，再进入下一项。
- 任务 Agent 必须区分事实、推断和未知项，记录命令、Git SHA、制品摘要和 Evidence ID。
- 协调 Agent 负责维护本文件、汇总证据和提交 P0 门禁复核；任务 Agent 不得自行宣布 P0 通过。
- 全局 P0 未完成前，不宣布全量迁移完成、不删除 V3/Wujie、不创建最终发布分支；模块开发仍须先通过自身 REA 门禁，不修改 `release-4.1.5`，不未经授权部署 131 或生产环境。

## 任务看板

| 任务        | 负责人     | Worktree                                          | 分支                     | 当前进度                                                                                                                              | 证据交付                                                                                                                                                                        | 阻塞项/下一步                                                                                                         |
| ----------- | ---------- | ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| P0-Audit    | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-audit`    | `feature/v4-p0-audit`    | 首轮证据后完成 V3 Action 调用点、参数、Wujie 实例和制品字符串映射；已顺序补充六类作用域和静态权限路径矩阵；本轮补充运行时入口和错误态 | `p0-audit-evidence.md`，`p0-route-inventory.md`，`p0-action-inventory.md`，`p0-risk-closure-matrix.md`，`p0-runtime-evidence.md`，`p0-runtime-closure-20261017.md`，`5fc90ebf5` | 已确认 11 个业务调用文件和 3 个桥接文件；联邦 fixture、低权限、全量 Action、Network、错误态闭环和 V4 替代行为仍待补齐 |
| P0-REA      | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-rea`      | `feature/v4-p0-rea`      | 已完成 Action 重点 Chunk 的第二次 focused REA                                                                                         | `p0-rea-evidence.md`，`8c6f59e69`，Evidence `ev_1499abcad9683e664b746ef8c97b96092158e1ab805d6c75f60f17b23c9da037`                                                               | 7 个指定 Chunk 纳入同一制品分析；application/semantic coverage 仍 partial，运行时入口仍待补齐                         |
| P0-Baseline | 协调 Codex | `/home/bruce/code/ks-develop/console-p0-baseline` | `feature/v4-p0-baseline` | 已顺序核验 release-3.4 版本、commit、许可证和当前制品更新提交                                                                         | `p0-baseline-evidence.md`，`p0-v3-module-source-evidence.md`，`be20bc7a3`                                                                                                       | 候选源码身份已固定；当前 2025 外部 `v3dist` 与旧源码的构建 provenance 仍未关闭                                        |

> 历史记录：此前的 Multi-Agent 启动请求曾返回协作服务 `429`，没有产生 Agent 提交。该记录保留用于解释历史证据来源；当前已按项目负责人指令停止使用 Multi-Agent，不再重试或追加子 Agent。

## 当前基线

| 项目                 | 实际值                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| 稳定基线             | `release-4.1.5` / `fc1253cbe`                                                |
| P0 取证基线          | `origin/feature/v4-migration` / `3e09afd6a`                                  |
| 原有开发工作区       | `feature/v4-configmaps-secrets`                                              |
| 原有 Draft PR        | [PR #1](https://github.com/mysStack/console/pull/1)                          |
| 当前顺序取证文档汇总 | `feature/v4-configmaps-secrets` / `259b556eccd19fbbbade8392db4954f195672114` |
| 本轮正式开发         | 按 ConfigMap、Secret、ServiceAccount 模块级 REA → DEV → VERIFY → PR 顺序恢复 |
| P0 门禁              | 分析中，待负责人复核                                                         |

## 2026-10-17 模块级 VERIFY 结果

本轮在 131 测试环境完成新制品构建、发布、部署、rollout 和 Playwright 取证。制品为 `feature-v4-configmaps-secrets-20261017-164719-5e12c0ec3f4c`，digest 为 `sha256:a2600930a7f5e199e4a2f8db49669b4dd16bf26c4330fdf7cb82ab5be32b30ac`，Pod imageID 与该 digest 一致。GitHub Actions Run 为 `39018611070`。本轮部署制品对应的 Git HEAD 为 `5e12c0ec3f4cfe295cb57859a19ae8b913661f5f`；本记录提交后，PR #1 的 Head 和变更文件数以 GitHub 实际状态为准，PR 继续保持 Draft。

| 模块           | 当前状态                | 本轮实际结果                                                                                                               | 阻塞/未完成                                                    |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ConfigMap      | VERIFY 部分通过，待补齐 | 原生项目筛选、创建、详情、元数据编辑、历史、元数据、事件、批量删除、单项删除、缓存刷新及部署后页面渲染已验证               | 数据编辑提交、配置引用、低权限 RBAC 和完整跨项目正反隔离未完成 |
| Secret         | VERIFY 部分通过，待补齐 | 默认脱敏修复、部署后列表渲染、真实登录、页面截图和刷新路径已验证；名称列布局问题已修复                                     | 编辑、YAML、配置引用、低权限 RBAC 和完整 namespace 隔离未完成  |
| ServiceAccount | VERIFY 部分通过，待补齐 | 原生项目/集群列表、创建、详情、删除、角色入口、项目路由及部署后页面渲染已验证；API 确认新 SA 没有自动生成长期 Token Secret | 角色提交、可编辑字段、低权限 RBAC 和完整 namespace 隔离未完成  |

当前只有 `admin` 测试凭据，未找到可用于低权限拒绝路径的专用账号；本轮没有创建额外权限，也没有用 admin 模拟低权限通过。三个模块均不能标记为“已验收”。详细证据见 [ConfigMap/Secret VERIFY](./config-secrets-131-verify-20261017.md) 和 [ServiceAccount VERIFY](./service-account-131-verify-20261017.md)。

本轮针对性运行时收尾已形成 [`p0-runtime-closure-20261017.md`](./p0-runtime-closure-20261017.md)：cluster、workspace、platform、extension 代表性入口和 workspace DevOps 打开/取消 Action 已取证；联邦项目、低权限 RBAC、全量 Action 和扩展错误闭环仍未完成。

## 2026-10-17 Secret 脱敏修复复验

修复提交为 `8275096ab220b2eb813c1b27e043efa4ea4f2da0`。本轮通过 GitHub Actions Run `39023050476` 构建并发布 `feature-v4-configmaps-secrets-20261017-175822-8275096ab220`，镜像 digest 为 `sha256:9ca9d048bd767512929ef01a743e6bfe0bf73954e6ac46f13170a655364ac5cd`。131 上的 `ks-console-6d59c9fb67-8td2j` 已 Running/Ready，Pod imageID 与该 digest 一致。

Playwright 直达 Secret 详情页和刷新后，默认数据区域均显示固定掩码 `******`，不再显示 Base64 数据；专用复验 Secret 已清理。Secret 的模块门禁由“脱敏失败阻塞”调整为“VERIFY 部分通过，待补齐”，编辑、YAML、配置引用、低权限 RBAC 和完整 namespace 隔离仍未完成，不能标记为“已验收”。

本轮浏览器日志同时记录到全局运行时错误：登录页出现 `ReferenceError: common is not defined`，登录后扩展初始化出现 `getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 未定义。它们未阻止 Secret 详情页加载，但浏览器验收结论应表述为“目标功能可访问，存在未关闭的全局运行时错误”；这些问题不归因于 Secret 脱敏修复，需单独追踪。

## 2026-10-17 当前制品登录与页面渲染复验

本轮针对浏览器实际显示又发现并修复了 Secret 列表的列宽问题。旧布局中名称列实测约 `95px`，长名称在截图中几乎逐字换行；提交 `259b556eccd19fbbbade8392db4954f195672114` 将类型、字段数量和创建时间列收窄，名称列实测约 `253px`。项目级和集群级 Secret 列表均同步调整，并补充了列宽回归断言。

当前 131 制品和浏览器证据如下：

- 镜像：`feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`
- 镜像 digest：`sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`
- GitHub Actions：Run `39027793096`，Unit tests 和 Build and publish 均通过
- Deployment：`ks-console` generation/observedGeneration `507/507`，副本、Ready、Updated、Available 均为 `1`
- Pod：`ks-console-69fc77bb7b-gbb2j` Running/Ready，imageID 与上述 digest 一致
- 登录：新建 Playwright 会话从 `/login` 登录后进入 `/dashboard`，未输出账号密码
- 页面：登录后实际截图检查 Secret、ConfigMap、ServiceAccount 三个原生列表页面，标题、侧边栏、工具栏、表格和数据行均渲染成功。截图仅保留在本地 `.playwright-cli/`，没有提交到 Git：
  - `.playwright-cli/page-2026-10-17T11-19-45-106Z.png`
  - `.playwright-cli/page-2026-10-17T11-20-25-903Z.png`
  - `.playwright-cli/page-2026-10-17T11-20-57-218Z.png`
- 页面仍有全局控制台错误：`common is not defined`、`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks`、`ConfigConstants`；因此结论是“登录成功、目标页面可渲染、存在未关闭的全局运行时错误”，不能写成浏览器无错误

本轮仅完成视觉渲染和登录闭环补证，ConfigMap、Secret、ServiceAccount 仍保持 `VERIFY 部分通过，待补齐`，未改变全局 P0 门禁，也未自动进入 Deployment。

## 2026-10-17 namespace 作用域问题修复状态

已定位项目资源页面显示全量 namespace 的根因：项目路由的 `namespace` 参数未传入通用 `ListPage` 的默认资源请求和选择器状态。当前分支已提交 `00310f5e5a3105f177e9e8d413db359f26bbd1d1`，修复 ConfigMap、Secret、ServiceAccount 的项目级选择器和 ConfigMap/Secret 请求 URL，并锁定项目创建弹窗的 namespace。

本地 56 个测试文件、225 个测试，以及相关 lint、格式、构建检查通过；Actions Run `39031017563` 的构建和发布通过。候选镜像 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31` / `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54` 在 131 部署时超过 300 秒仍停在 `ContainerCreating`，未产生 imageID，rollout 超时后已回滚。当前 131 仍运行上一版 digest `sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`。

状态：代码修复已提交并推送，候选制品部署失败后已回滚；浏览器尚未在修复制品上复验，因此 namespace 作用域修复待重新部署后验证。三个模块继续为“VERIFY 部分通过，待补齐”，全局 P0 继续为“分析中，待负责人复核”。

## 2026-10-17 修复制品部署与浏览器验证完成

同一候选镜像第二次部署成功：Deployment generation/observedGeneration `510/510`，Pod `ks-console-699dd9c46f-jstfd` Running/Ready，实际 Pod imageID 为 `ghcr.io/mysstack/ks-console@sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`，rollout 成功。

使用已登录的真实 Playwright 会话检查项目 ConfigMap、Secret、ServiceAccount 页面：三个页面均不显示“全部项目”；ConfigMap、Secret、ServiceAccount 的可见资源行分别为 1、2、1，项目列均为 `v4-migration-e2e`。Secret 额外完成直达、刷新和浏览器返回验证，路由和行数据保持稳定；三张截图保存在 `.playwright-cli/`，未提交。

结论：namespace 作用域代码已完成部署后页面验证。模块状态仍为“VERIFY 部分通过，待补齐”，因为编辑、配置引用、低权限 RBAC、完整隔离和全部功能等价性未完成；全局 P0 仍为“分析中，待负责人复核”。

## 2026-10-17 namespace 漏测复盘

本次漏测根因已确认：修复前的项目列表测试是源码级断言，没有对 `ListPage` 的资源 URL 和页面选择器做运行时断言；之前浏览器验收也只检查页面渲染，没有检查可见资源是否全部属于当前路由 namespace。后续 VERIFY 已增加当前 namespace、选择器隐藏、刷新、返回和可见行项目列检查，并在修复制品上完成部署后复验。

登录验证还存在环境阻塞：`/home/bruce/.bashrc` 在非交互 shell 中提前返回，普通 `source` 不会加载测试变量；改用交互 shell 后当前测试账号被服务端拒绝。因此本轮页面结论基于已登录浏览器会话，不能把新的独立登录流程记为通过；测试账号需要轮换后再补独立登录验证。

## 2026-10-17 主流程收尾复核

- 本地回归：ConfigMap、Secret、ConfigReference、ConfigHistory 和配置编辑相关测试共 19 个文件、119 个用例通过。
- 131 制品：继续确认 `ks-console` generation/observedGeneration 为 `510/510`，Pod `ks-console-699dd9c46f-jstfd` 为 Ready，Pod imageID 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`。
- 浏览器状态：修复制品上既有的项目 namespace 列表、刷新和返回证据仍有效；当前会话已过期，新的独立登录被测试环境拒绝，未将其记为通过，也未继续尝试凭据。
- 未关闭项：ConfigMap/Secret 数据编辑、YAML 持久化、配置引用工作负载、ServiceAccount 角色提交、低权限 RBAC、完整跨 namespace 正反路径和全局浏览器运行时错误。
- 门禁：三个模块仍为“VERIFY 部分通过，待补齐”；全局 P0 仍为“分析中，待负责人复核”；PR #1 保持 Draft，未进入 Deployment 模块。

## 2026-10-17 ServiceAccount 角色缓存修复

- 定位：角色修改弹窗的 React Query 键固定为 `['roles']`，与实际 cluster/namespace 请求参数不一致，存在跨作用域复用角色选项的风险。
- 修复：查询键改为包含 `detail?.cluster` 和 `detail?.namespace`，新增 `ModifyRole` 回归测试；没有改变角色 API 或提交权限。
- 验证：`./scripts/test.sh` 通过（57 个文件、226 个用例）；ServiceAccount 相关 6 个文件、8 个用例通过；相关 ESLint、Prettier、`git diff --check` 和 `corepack yarn build:packages` 通过。
- 未完成：新代码尚未构建镜像并部署到 131，尚未完成新制品浏览器角色弹窗验证、角色提交、低权限 RBAC 和完整 namespace 隔离。

## 2026-10-17 ServiceAccount 角色修复制品部署

- 代码 `05450c14f733a1c2e189270f2b257759dadacd8b` 已通过 GitHub Actions Run `39038790572` 构建并推送。
- 镜像 `feature-v4-configmaps-secrets-20261017-215959-05450c14f733`，digest `sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`。
- 131 rollout 成功：generation/observedGeneration `511/511`，Pod `ks-console-56cbbb9df8-ptp5r` Ready，imageID 与 digest 一致。
- 浏览器直达已执行，但已有会话已过期并被重定向到登录页；当前测试账号仍未恢复，未继续尝试凭据，因此新制品的页面、角色弹窗和角色提交尚未验收。

## 2026-10-17 浏览器凭据处理阻塞

后续登录尝试确认当前 Playwright CLI 会在命令回显中暴露直接传入的表单值，已停止继续使用该方式，并要求再次轮换测试账号。未将凭据写入仓库、文档或测试配置；账号轮换完成后需改用不会把变量值拼入 CLI 输出的执行方式重新完成浏览器登录。新制品的角色弹窗和提交验收继续保持未完成。

## 本轮顺序核验：Git 集成与风险关闭

| 项目                            | 实际结果                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `feature/v4-migration`          | `3e09afd6a051d4091b3c887462c880eff2ba6754`，作为 P0 取证基线；未修改                                                                                                                                   |
| `feature/v4-configmaps-secrets` | 风险核验起点为 `3f19924fc665dcfdb1a1fdee840bcef1d73f9d97`，相对迁移基线领先 63 个提交、相对远程分支领先 38 个提交；本轮文档提交后本地 HEAD 为后续新 SHA，未 push                                       |
| `feature/v4-p0-audit`           | `5fc90ebf5`，相对迁移基线领先 5 个提交，Worktree clean                                                                                                                                                 |
| `feature/v4-p0-rea`             | `8c6f59e69`，相对迁移基线领先 3 个提交，Worktree clean                                                                                                                                                 |
| `feature/v4-p0-baseline`        | `be20bc7a3`，相对迁移基线领先 8 个提交，Worktree clean                                                                                                                                                 |
| Draft PR #1                     | GitHub 核验快照（本轮文档提交前）：head `aea9806eb`，base `feature/v4-migration`；67 个提交、25 个文件，包含 ConfigMap/Secret 代码测试以及 ServiceAccount、P0 审计等文档；当前保持 Draft，待负责人复核 |
| 安全整理建议                    | 保留三个 P0 分支和现有提交；保留 Draft PR #1；先拆分或明确 PR 范围，再由人工决定 push/合并；不强推、不改写历史、不自动合并                                                                             |

详细路由、Action、作用域、RBAC、API 和 V4 替代行为矩阵见[针对性风险关闭矩阵](./p0-risk-closure-matrix.md)。

## 本轮质量检查问题

已确认三个 P0 Worktree 缺少被 `.gitignore` 忽略的 `.husky/_/husky.sh`，而主工作区存在；因此 P0 Worktree 的提交会报 Hook 引用失效。当前没有修改 Hook 或业务代码。最小修复是为每个 Worktree 执行既有 `yarn prepare`/依赖初始化并增加文件存在性检查；此前用 `git -c core.hooksPath=/dev/null` 提交文档，只能说明 Git 提交成功，不能说明 lint-staged、测试、类型检查或构建通过。

## 模块 DEV 本轮提交与验证

本轮在 `feature/v4-configmaps-secrets` 上完成 ServiceAccount Secret 引用脱敏，并修复 Node 22 下 `build:packages` 的脚本模块兼容问题。相关提交为 `ec21875c1`（业务代码）、`5c0162517`（构建脚本）；当前本地 HEAD 为 `5c0162517`，相对远程分支领先 3 个提交，未 push。

| 检查                           | 命令                                                                                                                                                                              | 结果                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 回归测试                       | `./scripts/test.sh`                                                                                                                                                               | 55 个文件、220 个测试通过                                          |
| ServiceAccount/相关代码 ESLint | `./node_modules/.bin/eslint packages/shared/src/stores/serviceAccounts.ts packages/shared/src/stores/serviceAccountsMapper.ts packages/shared/src/stores/serviceAccounts.test.ts` | 通过                                                               |
| 包构建                         | `corepack yarn build:packages`                                                                                                                                                    | Node `v22.22.1` 下通过；appstore、console、core、shared 均完成构建 |
| 格式与差异检查                 | `prettier --check scripts/build-packages.js`、`git diff --check`                                                                                                                  | 通过                                                               |

该结果只完成本地 DEV 验证，不代表模块 VERIFY 或正式 PR 已完成。尚未部署新制品到 131，未执行 rollout、Playwright、真实环境权限正反路径、namespace 隔离和 Secret 运行时关联验证；因此 ConfigMap、Secret、ServiceAccount 仍保持“分析中/收尾中”。

## 完成条件

- [x] P0-Audit 形成首轮静态依赖、路由、扩展、动态 Action 和构建入口盘点；待统一复核。
- [x] P0-REA 形成首轮可复核的 REA Evidence、覆盖范围、限制和未知项记录；待统一复核。
- [ ] P0-Baseline 已固定 Git 基线、V3 源码候选的版本、commit、许可证和当前编译制品边界，但当前制品与源码的构建对应关系仍未关闭（P0-U001/P0-U004）。
- [x] 协调 Agent 已汇总首轮三项证据，并补充 [131 运行时与制品身份证据](./p0-runtime-evidence.md) 和 [P0-REA 门禁复核包](./p0-gate-review.md)；[REA 阶段分析总结](./rea-analysis-summary.md) 已更新，仍待门禁复核。
- [ ] 项目负责人或指定复核人确认 P0-REA 门禁结论。

## 状态更新规则

任务完成必须同时提供任务分支 SHA、证据文件、执行命令、结果、未知项和阻塞项。状态只由协调 Agent 汇总更新；单个 Agent 的“完成”不等于 P0 门禁通过。

## 历史：2026-10-17 双 Explorer 并行复核批次

本批遵循“最多两个子 Agent、同批并行、批次完成后再调度”的规则，未创建下级 Agent，也没有修改代码、分支、Worktree 或配置。

| Explorer                       | 任务                                                           | 结果                                                                                                                                                                          | 状态/错误                                                                                                  |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/root/p0_audit_route_action`  | 只读核对 P0-U002 的 V3 Action 调用点、模块参数和运行时映射缺口 | 初始摘要写成 10 个业务调用文件；后续单会话复核确认实际为 11 个业务调用文件，另有 3 个实现/导出文件；确认当前仍缺少 131 触发入口、权限、Network、错误态、V4 替代实现和回滚证据 | 已完成；未修改文件；P0-U002-B 仍未关闭                                                                     |
| `/root/p0_baseline_provenance` | 只读核对 P0-U001/P0-U004 的旧源码与 `v3dist` 制品 provenance   | 未形成可用结果                                                                                                                                                                | 协作服务返回原始 `429 Too Many Requests`：`c9980dfe-945b-4033-a789-63ec10b87ba0`；按规则停止追加任务和重试 |

本批没有产生新的提交。该批次属于历史执行记录，不能作为当前执行模式。P0-Baseline 的 P0-U001/P0-U004 和 P0-Audit 的 P0-U002-B 仍保持“分析中”；独立复核未完成前，P0 门禁保持“分析中，待负责人复核”，不进入 P1/P2 正式开发。

## 2026-10-17 单会话模块级 VERIFY 增量

本轮未启动子 Agent，继续使用单 Codex 会话完成当前制品的浏览器验收。部署和制品身份保持如下：

- 代码：`05450c14f733a1c2e189270f2b257759dadacd8b`
- 镜像：`feature-v4-configmaps-secrets-20261017-215959-05450c14f733`
- digest：`sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`
- Pod：`ks-console-56cbbb9df8-ptp5r`，Running/Ready，imageID 与 digest 一致
- GitHub Actions：Run `39038790572`

| 任务                  | 实际结果                                                                                             | 状态           |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------- |
| 浏览器登录和页面渲染  | 真实登录成功；ConfigMap、Secret、ServiceAccount 项目页面均正常渲染，当前项目页面不显示全局项目选择器 | 已完成本轮证据 |
| ConfigMap 浏览器 CRUD | 专用对象创建、详情、元数据编辑、YAML 打开、历史/元数据/事件、删除和清理完成；未提交 YAML 数据修改    | 部分通过       |
| Secret 浏览器 CRUD    | 专用对象创建、详情默认掩码、元数据编辑、历史/元数据/事件、删除和清理完成；测试值未写入证据           | 部分通过       |
| ServiceAccount 角色   | 专用对象创建，`viewer` 角色提交后列表刷新显示，随后删除；跨项目角色缓存切换证据完成                  | 部分通过       |
| 低权限 RBAC           | 没有低权限测试账号，未使用 admin 模拟拒绝路径                                                        | 阻塞           |

本轮新增测试对象及配置历史对象已清理，测试 namespace、既有对象和稳定分支均保留。三个模块仍不能标记为“已验收”；全局 P0 风险和 PR #1 Draft 状态不变。

## 2026-10-17 当前测试批次：ConfigMap 数据编辑

| 任务                       | 负责人          | 分支                            | 实际结果                                                                                                                                     | 状态                              |
| -------------------------- | --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| ConfigMap 数据编辑和持久化 | 当前 Codex 会话 | `feature/v4-configmaps-secrets` | 在 131 已部署制品 `05450c14f733` 上用 Playwright 从“编辑设置”新增数据键；详情页、API、刷新和修改记录均一致；专用对象及配置历史 Secret 已清理 | 数据编辑已验证，YAML 持久化未验证 |
| ConfigMap YAML 提交        | 当前 Codex 会话 | `feature/v4-configmaps-secrets` | 编辑器可打开；一次自动化输入造成缩进叠加，提交收到 HTTP 400，未改变 Kubernetes 对象，不能计为成功或产品缺陷                                  | 待重新设计有效粘贴验证            |
| 低权限 RBAC                | 当前 Codex 会话 | `feature/v4-configmaps-secrets` | 当前只有 admin 测试账号，未模拟拒绝路径                                                                                                      | 阻塞                              |

本批未修改业务代码，未启动子 Agent，未部署新制品。当前仍运行 `feature-v4-configmaps-secrets-20261017-215959-05450c14f733`，Pod `ks-console-56cbbb9df8-ptp5r` 为 Ready，实际 imageID 对应 digest `sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`。ConfigMap、Secret、ServiceAccount 均继续保持“VERIFY 部分通过，待补齐”，全局 P0 保持“分析中，待负责人复核”。

## 2026-10-17 Secret 编辑设置脱敏修复复验

本轮继续按单 Codex 会话顺序执行，没有启动子 Agent。上一轮浏览器检查发现：Secret 详情页默认掩码正常，但“编辑设置”会把已有数据解码后回填，造成明文暴露。该问题已通过最小代码修复并完成新制品闭环验证。

| 检查项         | 实际结果                                                                                                                                           | 状态       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 修复提交       | `ba5a4518d`、`d6b4135fc`；Secret 编辑表单保持已有值为空/掩码，新值才编码提交                                                                       | 已完成     |
| 本地回归       | `./scripts/test.sh packages/console/src/pages/clusters/components/DataList/dataListUtils.test.ts`；58 个文件、230 个测试通过                       | 已完成     |
| GitHub Actions | Run `39046026262`；Unit tests、Build and publish 均成功                                                                                            | 已完成     |
| 131 制品       | tag `feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`；digest `sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e` | 已部署     |
| Pod 身份       | `ks-console-7766585f4-7lz6x` Running/Ready；imageID 与上述 digest 一致；Deployment generation/observedGeneration `512/512`                         | 已完成     |
| 浏览器详情页   | 专用 Secret 数据显示 `******`                                                                                                                      | 已验证     |
| 浏览器编辑设置 | 已有键显示为空值状态，没有回显原 Secret 值                                                                                                         | 已验证修复 |
| 清理           | 专用 Secret 和本轮生成的历史 Secret 均经 API 复核为 NotFound；namespace 保留                                                                       | 已完成     |

Secret 的明文暴露缺陷已完成“代码 → CI → 131 rollout → 真实浏览器复验”闭环，可以标记为**已验证修复**。Secret 模块总体仍不能标记为“已验收”：YAML 持久化、配置引用、低权限 RBAC、完整 namespace 正反隔离和全部 V3 功能等价性仍未完成。浏览器控制台仍有 `common is not defined`、`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 等既有全局/扩展错误，未作为本轮 Secret 修复的回归通过条件。

本轮浏览器页面仍使用真实登录会话，测试值没有写入日志、快照、文档或提交。PR #1 继续保持 Draft，全局 P0 继续保持“分析中，待负责人复核”，不自动进入 P1/P2。

## 2026-10-18 模块级 VERIFY 收尾补充（单 Codex 会话）

| 任务                      | 分支 / 制品                                                                                                                                                                                   | 实际结果                                                                                                      | 状态   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| ConfigMap YAML 持久化     | `feature/v4-configmaps-secrets`；131 镜像 `feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`；Pod imageID `sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e` | 通过真实浏览器编辑 Ace 模型，提交成功；刷新页面和 Kubernetes API 均保留新增键；专用对象已清理                 | 已验证 |
| ConfigMap/Secret 配置引用 | 同上；专用 Deployment `v4-ref-workload-20261018` rollout 成功                                                                                                                                 | 浏览器显示 ConfigMap/Secret 引用和键数量；Secret 只显示键名；前缀写入 Deployment 后刷新仍保留；专用资源已清理 | 已验证 |
| 低权限 RBAC               | 当前仅有 admin 浏览器会话                                                                                                                                                                     | 没有低权限测试账号，未使用 admin 模拟拒绝路径                                                                 | 阻塞   |
| 完整跨 namespace 正反隔离 | `v4-migration-e2e`                                                                                                                                                                            | 当前 namespace 列表范围已验证；本轮没有低权限账号和第二个专用 namespace，未宣称完整正反隔离                   | 未完成 |
| 扩展运行时错误            | 不纳入本轮                                                                                                                                                                                    | 按负责人指令暂不处理 `getExtensionConsoleV3Embed` 等既有扩展错误                                              | 延后   |

### 本轮实际验证命令

- `kubectl -n v4-migration-e2e rollout status deployment/v4-ref-workload-20261018 --timeout=180s`
- `kubectl -n v4-migration-e2e get deployment/v4-ref-workload-20261018 -o json | jq ...`（只输出引用名称、前缀、挂载关系和状态，不输出 Secret 值）
- Playwright 会话 `v4-verify-20261017b`：ConfigMap YAML 编辑、刷新、配置引用页面、Secret 键名查看、前缀应用和刷新
- 清理后逐项执行 `kubectl -n v4-migration-e2e get ...`，五个本轮对象均为 NotFound

本轮没有修改业务代码，没有新建镜像或重新部署；复用的部署制品、Pod 身份和浏览器证据均已在 `config-secrets-131-verify-20261017.md` 记录。当前分支只新增本轮文档提交，模块仍为“VERIFY 部分通过，待补齐”，不进入 Deployment 正式开发。

## 2026-10-18 应用模板详情补测（单 Codex 会话）

| 负责人          | 分支                            | 提交 / CI                                                                    | 实际结果                                                                                                            | 状态         |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| 当前 Codex 会话 | `feature/v4-configmaps-secrets` | `b3e7571b4bddd812dd65fa67ea3741a48c14ef9c`                                   | 修复工作区应用模板详情路由未挂载和 `appId`/`appName` 参数不一致；部署后直达详情路由返回 200 并进入版本页            | 已验证       |
| 当前 Codex 会话 | `feature/v4-configmaps-secrets` | `57f297f90f40136f57ba1fdd40c1417b17839abd`；GitHub Actions Run `39132471323` | 恢复 `VersionListDetail` 的原生 `VersionList`，补充版本列表回归测试；本地 61 个文件、236 个测试通过，构建和 CI 通过 | 已提交并部署 |

### 131 部署证据

- 镜像 tag：`feature-v4-configmaps-secrets-20261018-214008-57f297f90f40`。
- 多架构 index digest：`sha256:24a0b0ed8d1b51afdaac381df715fc82529b342fb621b22a844aef2af0865041`。
- Deployment `ks-console` generation/observedGeneration：`517/517`，副本 `1/1` Ready。
- Pod：`ks-console-58975f9479-vpx2b`，`Running/Ready`，实际 imageID：`sha256:3e299d0217e60ab90258830bc21cce12e61fbafc2f075792cbb3658c0e28bc62`。

### 浏览器验证

真实浏览器登录后直达 `/workspaces/test-workspace/apps/stakater-configmap`，详情 API、版本列表 API 和 3 个版本详情 API 均为 200；页面渲染 1.0.5、1.0.2、1.0.1 三个版本，总数为 3。版本项可展开查看 Chart Files、Version Information、Deployment 和 View in Store；Upload Version 弹窗可打开，Cancel 可关闭且未产生写操作。

本轮只关闭详情路由和版本列表渲染缺口。A09 的应用模板创建仍缺少可用 fixture；A12 的编辑保存、删除、上传成功、失败/取消完整路径及 V3 Action 移除仍未闭环。此前点击详情页 Edit 出现的页面空白已由后续制品修复并完成表单渲染复验，不能再作为当前制品缺陷，但仍不能扩大为编辑写入等价通过。扩展初始化错误按负责人指令延期，PR #1 继续保持 Draft，全局 P0 仍为“分析中，待负责人复核”。

## 2026-10-18 应用模板编辑表单补测（最新制品）

本轮继续执行未闭环的 V3 入口验证，没有启动子 Agent，也没有重新进行全量 REA。针对上一轮应用模板详情页点击“编辑”出现空白的问题，在提交 `5371d69470e4`、`7ba63676c` 和 `1f711bb66b3b` 的最新制品上完成真实浏览器复验：

- 镜像 tag：`feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b`；CI Run `39137798758` 已成功。
- 131 Deployment `ks-console` generation/observedGeneration 为 `519/519`，副本 `1/1` Ready。
- Pod `ks-console-797469cf84-mgndq` 为 `Running/Ready`，实际 imageID 为 `ghcr.io/mysstack/ks-console@sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。
- 真实浏览器直达 `/workspaces/test-workspace/apps/stakater-configmap/versions`，编辑弹窗正常显示；名称、描述、分类、图标、服务商网站均正确回填。点击“取消”后弹窗关闭并保持版本列表路由，未产生写请求。
- 本轮截图为 `.playwright-cli/page-2026-10-18T15-01-35-559Z.png`，仅保留在本地未跟踪生成物中；临时账号、IAM 绑定和凭据文件已清理，`v4-migration-e2e` 未删除。

本轮关闭 A12 的编辑表单渲染、字段回填和取消子路径。编辑保存、删除、上传成功、上传失败/取消完整路径、项目从应用模板创建和 V3 Action 移除仍未验证；扩展初始化错误按负责人指令延期。三个 ConfigMap、Secret、ServiceAccount 模块仍不能标记为完整验收，全局 P0 和 PR #1 状态不变。

## 2026-10-18 低权限 RBAC 验证补充（单 Codex 会话）

| 任务                | 实际结果                                                                                                                                     | 状态           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 临时低权限账号      | 创建 `v4-rbac-viewer-20261018`，绑定 `test-workspace` 查看角色和 `v4-migration-e2e` 项目 `viewer` 角色；测试后用户、两个绑定和临时凭据均清理 | 已完成         |
| ConfigMap RBAC      | 浏览器登录后列表/详情 GET 为 200；POST、PUT、DELETE 均为 403；页面没有写操作入口                                                             | 已验证         |
| Secret RBAC         | 浏览器登录后列表/详情 GET 为 200，详情只显示掩码；POST、PUT、DELETE 均为 403；页面没有写操作入口                                             | 已验证         |
| ServiceAccount RBAC | 浏览器登录后列表 GET 为 200；POST、PUT、DELETE 均为 403；页面没有创建、角色修改或删除入口                                                    | 已验证         |
| namespace 数据范围  | `v4-migration-e2e` 页面只显示当前项目对象；只读访问 `test-wes` 时只显示 `test-wes` 对象，没有跨页面混入                                      | 已验证本轮范围 |
| 完整 RBAC/功能等价  | 全量权限矩阵、错误态组合和全部 V3 功能等价性未完成                                                                                           | 未完成         |
| 扩展运行时错误      | 按负责人指令暂不处理                                                                                                                         | 延后           |

本轮使用的已部署制品仍为 `feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`，digest `sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e`，Pod `ks-console-7766585f4-7lz6x` 为 Running/Ready；没有修改业务代码、没有重新构建镜像、没有部署新制品。

### 项目级权限模型补充

另创建临时账号 `v4-project-viewer-20261018`，只绑定 `v4-migration-e2e` 项目 `viewer` RoleBinding，不绑定企业空间角色。该账号登录成功，但直达项目 ConfigMap 路由得到 `/errors/403`；验证了当前浏览器入口还要求 WorkspaceRoleBinding。该账号和绑定已清理。前一个带 `test-workspace` 查看角色的低权限账号能访问多个项目，但各项目页面只返回当前 namespace 数据；因此低权限读写边界已关闭，企业空间成员与项目可见范围的最终策略仍需单独确认。

## 2026-10-18 当前任务状态：Secret YAML 阻塞已修复并复验

| 负责人          | 分支                            | 提交                     | 任务                                                                                          | 状态       | 证据与阻塞                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前 Codex 会话 | `feature/v4-configmaps-secrets` | `cc36e3535`、`cc8e9fc7e` | 修复 Secret YAML 编辑器回显 `data` 和 `last-applied-configuration` 的问题，覆盖项目与集群入口 | 已验证修复 | 本地 `./scripts/test.sh`：59 个文件、233 个测试通过；`corepack yarn build:packages`、变更文件 ESLint、`git diff --check` 通过；GitHub Actions Run `39094132849` 成功；最终镜像 `feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b` / `sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce` 已部署到 131，Deployment `514/514`，Pod `ks-console-5cd7f8cdcd-4r5tv` Ready；浏览器已验证不回显、修改持久化、刷新后掩码。 |

本轮先在实际项目路由发现第一次修复遗漏：只改集群配置入口不足以覆盖 `/test-workspace/clusters/host/projects/.../secrets/...`，项目详情仍调用通用 YAML 编辑器。该遗漏已由 `cc8e9fc7e` 补齐并重新完成构建、部署和浏览器验收，已记录到 [ConfigMap/Secret VERIFY 记录](./config-secrets-131-verify-20261017.md)。

当前未解决项：Secret 模块完整 namespace 正反隔离、全量错误态组合、全部 V3 功能等价性；扩展运行时错误按负责人指令延后。全局 P0 仍为“分析中，待负责人复核”，PR #1 保持 Draft，不自动进入下一个模块。

## 2026-10-18 当前任务状态：ServiceAccount 角色与可编辑字段已复验

| 负责人          | 分支/制品                                                                                      | 任务                                                          | 实际结果                                                                                                                                                                                                 | 状态           |
| --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 当前 Codex 会话 | `feature/v4-configmaps-secrets` / `feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b` | ServiceAccount 项目级创建、角色提交、允许字段编辑、刷新和删除 | 真实浏览器创建专用 ServiceAccount；`viewer` → `operator` 角色提交后 API RoleBinding 与页面刷新一致；别名和描述写入后 API/页面一致；删除后 ServiceAccount 和 RoleBinding 为 NotFound，既有 `default` 保留 | 已完成本轮证据 |

本轮使用的 Pod 为 `ks-console-5cd7f8cdcd-4r5tv`，imageID 对应 manifest digest `sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce`，Deployment generation/observedGeneration 为 `514/514`。ServiceAccount 模块仍未验收，剩余完整低权限矩阵、跨 namespace 正反隔离、集群/项目全部行为等价性和错误态组合；扩展运行时错误延后。

## 2026-10-18 项目 namespace 隔离和错误反馈继续验证

本轮在 131 最终制品 `feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b` / manifest digest `sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce` 上，使用真实浏览器登录，分别为 ConfigMap、Secret、ServiceAccount 创建并清理唯一临时对象。

| 验证项                                 | ConfigMap | Secret | ServiceAccount |
| -------------------------------------- | --------- | ------ | -------------- |
| 当前 namespace 列表显示对象            | 通过      | 通过   | 通过           |
| 详情页显示对象                         | 通过      | 通过   | 通过           |
| 刷新后保持                             | 通过      | 通过   | 通过           |
| 浏览器返回后保持                       | 通过      | 通过   | 通过           |
| 切换 `test-wes` 后排除当前对象         | 通过      | 通过   | 通过           |
| 不存在对象详情显示 Kubernetes NotFound | 通过      | 通过   | 通过           |

本轮关闭三个模块的项目级 namespace 展示/排除、刷新、浏览器返回和 NotFound 证据。模块仍为“VERIFY 部分通过，待补齐”，剩余完整 RBAC 组合、全部 V3 功能等价性和全部错误态组合；扩展运行时错误按负责人指令延期。测试对象均已清理，`v4-migration-e2e` namespace 保留。

本轮另通过真实浏览器验证 ConfigMap、Secret 的原生批量删除：各创建两个唯一临时对象，逐行勾选后提交确认，页面返回列表且两个对象均从页面消失，Kubernetes API 均为 `NotFound`；临时对象已清理，未输出 Secret 值。

ConfigMap、Secret、ServiceAccount 的创建弹窗取消路径也已验证：打开弹窗后直接按 `Escape`，弹窗关闭、路由保持列表页，未产生 Kubernetes 对象。

## 2026-10-18 网络失败错误反馈修复

| 项目       | 实际结果                                                                                                                                 | 状态         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 问题       | 无 HTTP response 的网络失败触发 `error.response.config.headers` 访问异常，资源列表只显示空列表                                           | 已定位       |
| 修复       | `8c6262d97` 增加网络错误消息格式化和可选 response/config/headers 保护                                                                    | 已提交并推送 |
| 本地测试   | `./scripts/test.sh`：60 个文件、235 个测试通过                                                                                           | 通过         |
| 构建和 CI  | `corepack yarn build:packages`、变更文件 ESLint、`git diff --check` 通过；Run `39125068845` 成功                                         | 通过         |
| 131 制品   | `feature-v4-configmaps-secrets-20261018-195453-8c6262d97d13` / `sha256:bf6577ccdaddd314e478b4ba7235865e695a705c1f50cc7ec132152566b3652c` | 已部署       |
| 浏览器验证 | 正常列表可渲染；拦截 ConfigMap 列表 API 后页面显示 `Network Error`，未再抛出无 response 异常                                             | 已验证       |

本轮网络失败验证使用 Playwright 只拦截目标列表 API，没有修改集群资源。真实 API Server 故障未执行；错误提示已补齐，页面同时保留空数据区域。扩展运行时错误继续延期。

## 2026-10-18 完整 RBAC 组合矩阵已执行

当前 Codex 会话在 131 已部署制品上完成六种临时账号组合的真实浏览器登录和浏览器内 API 验证：企业空间 viewer、项目 viewer、operator、admin、仅企业空间、仅项目和集群 viewer 边界均已记录。项目 ConfigMap、Secret、ServiceAccount 的读写状态码、ServiceAccount 角色 PATCH、项目/集群路由结果已写入[RBAC 组合验证记录](./rbac-matrix-131-verify-20261018.md)。

本轮没有使用 admin 代替低权限账号；所有临时业务资源已删除，`v4-migration-e2e` namespace 保留。该项关闭了低权限组合矩阵的实际 API 和路由证据缺口，但不关闭全部 V3 行为等价性，也不代表三个模块已经验收。真实 API Server 故障仍未执行，原因是需要对共享 131 集群实施可回滚故障注入。

## 2026-10-18 V3 功能逐项等价性核对

已完成 ConfigMap、Secret、ServiceAccount 模块范围内的 V3 Action 对照：基础创建、编辑、元数据、YAML、删除、批量删除和 ServiceAccount 角色均有旧源码、V4 入口及 131 运行时证据。核对同时发现旧 `secret.default` 默认 Secret 语义在当前 V4 中没有对应入口或 Store 实现，联邦 ConfigMap/Secret 仍保留 `consolev3` Embed；两项已登记为未等价，未冒充通过。全仓库其余 V3/Wujie Action 仍未完成逐项等价验收。

## 2026-10-18 全部业务 V3 Action 逐项跟踪

已将 11 个业务调用文件拆分为 12 个业务 Action 行，写入[全部业务 V3 Action 等价性矩阵](./v3-action-equivalence-matrix-20261018.md)。ConfigMap、Secret、ServiceAccount 资源自身的基础功能已完成模块级证据；工作负载模板编辑、DevOps、通知设置、应用模板和边缘操作仍有 V3/Wujie 依赖或运行时证据缺口，不能标记为全量等价。

## 2026-10-18 Deployment V3 入口运行时补充

创建并清理了专用 Deployment 后，使用临时项目 admin 账号真实登录 131 并打开项目 Deployment 详情。Network 证据同时出现当前 Deployment API 和 `/consolev3/dashboard`，确认项目工作负载详情仍存在 V3/Wujie 兼容入口；该项没有标记为 V4 等价通过。临时 Deployment、账号和 IAM 绑定均已清理。

## 2026-10-18 DevOps、通知、应用 V3 Action 取证

真实浏览器已打开 DevOps、应用模板和用户菜单入口。当前 `test-workspace` 没有 DevOps 页面可选集群，测试项目没有应用模板数据，用户菜单未启用通知设置入口，因此 `devops.create/edit`、`app.template.create.v2`、`openpitrix.template.edit.v2`、`notification.user.setting` 均保持“未验证”，没有用静态页面渲染冒充运行时等价。后续需要对应 fixture 或负责人确认模块未启用。

## 2026-10-18 静态依赖范围与 API Server 故障验证状态

当前工作树重新执行依赖清单扫描后，文件级命中数为：`wujie-react/WujieReact` 133、`ConsoleV3ResourceList` 28、`ExtensionConsoleV3Embed` 17、`useV3action/useV3Actions` 14、`consolev3` 路径 101。结果包含构建配置、测试和现有 `packages/shared/lib` 编译输出，并存在交集；这次只更新静态取证范围，不把命中数当作启用页面或 V3 等价通过。

RBAC 六种账号组合已经取得部署后真实浏览器/API 证据；全部 V3 Action 逐项等价性仍未完成，当前已确认项目 Deployment 详情保留 V3/Wujie 耦合，Secret 默认对象语义和联邦 ConfigMap/Secret 仍未等价，DevOps、应用模板、通知和边缘入口缺少可触发 fixture。真实 API Server 故障验证也未执行：131 为单节点 K3s 共享控制平面，当前授权不包含停止或重启远程 API Server。已有 Playwright 请求拦截只证明前端 `Network Error` 处理，不能替代集群故障证据。详见 [`api-server-fault-verify-20261018.md`](./api-server-fault-verify-20261018.md)。

## 2026-10-19 A01 ConfigReference 运行时补测

本轮继续补齐全部业务 V3 Action 的运行时证据，未启动子 Agent。使用当前 131 制品 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b` 和真实浏览器，在 `v4-migration-e2e` 创建专用 Deployment `v4-config-reference-20261019`、ConfigMap 和 Secret。

- 访问 `/test-workspace/clusters/host/projects/v4-migration-e2e/deployments/v4-config-reference-20261019/config-reference` 后，页面显示容器、ConfigMap/Secret 引用、键数量和“应用引用”入口；工作负载、引用资源请求均为 `200`。
- 通过浏览器分别写入 `CM_`、`SEC_` 前缀，Kubernetes API 复核 `envFrom` 持久化；清空前缀再次应用后 API 复核前缀移除。
- 页面和证据没有输出 Secret 值；专用 Deployment、ConfigMap、Secret 已删除并逐项确认 NotFound，`v4-migration-e2e` namespace 保留。

A01 的 ConfigReference 入口、引用展示、前缀写入/清除和 API 持久化子路径已验证。主工作负载模板编辑的 V3/Wujie 兼容入口、低权限拒绝、错误反馈和所有工作负载类型组合仍未闭环；A01 不能标记为完整等价。

## 2026-10-19 A03/A04 StatefulSet、DaemonSet 运行时补测

本轮在当前 131 制品上使用真实浏览器访问两个专用工作负载的 ConfigReference 路由：

- StatefulSet `v4-statefulset-20261019`：页面渲染 ConfigMap/Secret 引用、键名和“应用引用”，详情及引用 API 均为 `200`。
- DaemonSet `v4-daemonset-20261019`：页面渲染 ConfigMap/Secret 引用、键名和“应用引用”，详情及引用 API 均为 `200`。
- 两个页面均实际请求 `/consolev3/dashboard`，继续证明工作负载详情仍依赖 V3/Wujie 兼容壳；没有把 ConfigReference 页面可访问误判为工作负载详情 V4 等价。
- 专用 StatefulSet、DaemonSet、ConfigMap、Secret 已清理并逐项确认 NotFound。

A03/A04 的 ConfigReference 入口子路径已补充运行时证据，但主详情、模板编辑、错误态、低权限路径和 V3 Action 移除仍未完成，A03/A04 继续保持“未等价”。

## 2026-10-19 A05/A09/A11 应用入口补测

在当前 131 制品上使用真实浏览器访问项目应用模板和边缘应用入口：

- `/test-workspace/clusters/host/projects/v4-migration-e2e/applications/template`、`/applications/edge` 均返回 `200`，列表页面和“创建应用”弹窗正常渲染。
- 点击“从应用模板”后，应用模板弹窗正常打开，当前企业空间显示“未发现资源”；项目应用列表总数为 `0`。
- 本轮确认 A09 的入口和空数据态；A05、A11 仍没有可触发的边缘应用/应用模板 fixture，未执行创建、部署或删除写操作。页面同时观测到 `/consolev3/dashboard` 兼容请求。

A05、A09、A11 的成功、失败、取消、刷新、RBAC 和完整 V4 原生替代仍未验证，保持未完成；缺少 fixture 是当前环境条件，不得把空数据态写成等价通过。

## 2026-10-19 A06/A07/A08 DevOps 与通知入口补测

真实浏览器访问 `/workspaces/test-workspace/devops`：企业空间集群列表请求成功，但当前没有可选集群，页面显示“请选择集群”、空列表和“创建”入口，无法触发 `devops.create/edit`。打开用户菜单实际没有“通知设置”入口，只显示用户设置、登出、关于和技术支持，因此 `notification.user.setting` 没有可触发入口。

A06/A07/A08 当前仅取得入口和环境条件证据，成功、失败、取消、刷新、RBAC 和 V4 原生替代仍未验证；不把空列表或隐藏入口视为功能通过。

## 2026-10-19 A02 Deployment 详情补测

在 `v4-migration-e2e` 创建副本数为 0 的专用 Deployment `v4-deployment-20261019`，真实浏览器直达项目详情。页面进入 `resource-status`，编辑信息弹窗可以打开并取消，详情 API 返回 `200`；同时观测到 `/consolev3/dashboard` 请求，确认项目 Deployment 详情仍存在 V3/Wujie 兼容耦合。专用 Deployment 已删除并确认清理。

A02 的页面入口和取消子路径已取证，但模板编辑成功/失败、低权限、刷新/返回、完整 RBAC 和 V4 原生替代仍未完成，A02 继续保持“未等价”。

## 2026-10-19 A10 边缘工作负载入口核对

只读检查当前集群的 CRD 和 API Resource，没有发现 Edge/EdgeWorkload 相关资源；项目应用入口也没有可用边缘应用 fixture，无法触发 `workload.batch.delete.v2`。A10 的选择、确认、成功、失败、取消、刷新和 RBAC 路径保持未验证，不把缺少资源写成测试通过。

## 2026-10-19 A12 应用模板编辑保存补测

本轮继续处理应用模板 V3 Action 的未闭环写路径，没有重新进行全量 REA。为提供可控 fixture，在 `test-workspace` 临时创建 Application `v4-app-template-20261019` 和 ApplicationVersion `v4-app-template-20261019-1.0.0`，使用当前 131 已部署制品和真实浏览器直达版本页。

| 检查项       | 实际证据                                                                                                     | 状态       |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ---------- |
| 编辑表单回填 | 名称、描述、分类、图标和服务商网站均正确回填                                                                 | 已验证     |
| 编辑保存     | 修改描述后捕获应用详情 `PATCH 200`                                                                           | 已验证     |
| 刷新一致性   | 返回版本页并刷新后修改后的描述仍可见                                                                         | 已验证     |
| 删除确认     | “更多操作 → 删除”可打开确认框，并要求输入应用模板名称                                                        | 已验证入口 |
| 删除提交     | 同一真实浏览器会话输入应用模板名称后确认，捕获应用详情 `DELETE 200`，页面返回应用模板列表                    | 已验证     |
| 删除取消     | 重新创建临时对象后打开确认框，点击“取消”关闭弹窗，未产生 `DELETE` 请求且仍停留在版本页                       | 已验证     |
| 清理         | Application 删除后 ApplicationVersion 未自动清理，随后单独删除 ApplicationVersion，两个对象均确认 `NotFound` | 已完成     |

本轮关闭 A12 的编辑保存、刷新一致性、删除成功和删除取消子路径，不能把应用模板编辑标记为完整 V4 等价。删除失败、版本上传成功/失败、低权限路径和 V3 Action 移除仍未完成；临时测试对象已清理，`v4-migration-e2e` namespace 未删除。应用模板创建 A09、部署弹窗 A11 仍缺少可用 fixture，保持未验证。

## 2026-10-19 当前 GitHub/部署状态复核

- 当前分支 `feature/v4-configmaps-secrets` 的本轮文档提交已推送；Draft PR #1 的目标分支为 `feature/v4-migration`，GitHub 回读变更文件数为 71，PR 未合并。最新 SHA 以本次提交后的本地和远程回读为准。
- 131 的 `ks-console` Deployment generation/observedGeneration 为 `519/519`，副本 `1/1` Ready；当前仍部署镜像 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b`，Pod `ks-console-797469cf84-mgndq` 为 `Running/Ready`，实际 imageID 为 `sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。
- Kubernetes `/readyz?verbose` 通过；截至本段记录时只提交文档，真实 API Server 停止/恢复尚未获授权。本段状态已由下方 2026-10-19 实际故障注入记录 supersede。

## 2026-10-19 API Server 实际故障注入与恢复

项目负责人已授权在 131 维护窗口通过 `kubectl debug node/dev01` 停止和恢复宿主机 K3s，最长中断时间为 5 分钟。本轮使用 systemd timer 延迟 45 秒恢复 K3s，未修改业务代码、稳定分支或测试 namespace。

- 故障前：`readyz` 通过，`dev01` Ready，`ks-console` Deployment `519/519`，Pod `ks-console-797469cf84-mgndq` Ready，镜像 tag 为 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b`。
- 故障期间：浏览器监控 35 组请求；样本 0–10 的 ConfigMap、Secret、ServiceAccount 列表均为 `200`，样本 11 开始出现 `502`，样本 12–34 三类请求持续为 `502`。
- 恢复后：`readyz` 通过，`dev01` Ready，Deployment `520/520` 且 desired/ready/updated/available 为 `1/1/1/1`，Pod `ks-console-7796c9d77f-zq5f7` Ready，实际 imageID 为 `ghcr.io/mysstack/ks-console@sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。三个页面重新加载后分别显示 ConfigMap 1、Secret 4、ServiceAccount 1，未输出 Secret 明文。
- 清理：临时 debug Pod `node-debugger-dev01-s4grv` 已删除；`v4-migration-e2e` namespace 保留。

该证据关闭真实 API Server 故障环境验证项，但只覆盖三个目标资源列表的故障和恢复行为；全部 V3 功能等价性、全局扩展运行时错误和其他模块级 VERIFY 条件仍按各自记录处理。全局 P0 仍为“分析中，待负责人复核”，PR #1 继续保持 Draft。完整命令、样本和边界见 [`api-server-fault-verify-20261018.md`](./api-server-fault-verify-20261018.md)。

## 2026-10-19 A02/A03/A04 原生详情切换与部署后复验

本轮完成项目 Deployment、StatefulSet、DaemonSet 详情路由切换。提交 `3a14e96f1` 使用已有原生 Workload Detail，移除三个项目详情组件中的 `useV3action`/`WujieReact` 直接依赖；“编辑设置”入口改为原生 YAML 编辑器，保留编辑、回滚、伸缩、重启、删除和配置引用入口。

- 本地：`corepack yarn build:packages` 通过；`./scripts/test.sh` 通过，66 个测试文件、243 个测试通过；新增的原生详情和路由测试通过。
- CI：Run `39197149133` 成功，Unit tests 和镜像构建均通过。
- 131：镜像 tag `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，manifest digest `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`；Deployment `521/521`；Pod `ks-console-57fcd4d59f-sn5cp` Ready，实际 imageID 与 manifest digest 一致。
- 浏览器：三个原生详情路由均渲染，工作负载 API 为 `200`，没有 `wujie-app` 元素；“编辑设置”可打开原生编辑器，未提交写操作。
- 边界：应用启动仍有全局 `/consolev3/dashboard` 预加载请求；完整模板字段、写入成功/失败/取消、低权限、刷新/返回和全局 V3/Wujie 清理仍未完成。

本轮关闭的是三个项目详情组件的直接 V3 Action 桥接，不是全部 V3 Action 等价。临时测试工作负载已清理，`v4-migration-e2e` namespace 保留。

## 2026-10-19 A09/A11 远程模板创建和项目安装补测

| 项目     | 实际结果                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 执行方式 | 单 Codex 会话、真实 Playwright 浏览器、131 当前部署制品；未启动子 Agent                                                                                                                                                                                                                                                                                            |
| 测试入口 | 项目 `v4-migration-e2e` 的应用页面，选择远程仓库 `stakater` 的 `configmap` 模板                                                                                                                                                                                                                                                                                    |
| 成功证据 | 制品 `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，manifest digest `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`；Pod `ks-console-57fcd4d59f-sn5cp` Ready 且 imageID 一致；唯一测试名称 `v4-app-template-20261019` 完成安装；Application 创建请求 `POST 200`；列表刷新后显示“运行中”；详情、版本和应用设置请求为 `200` |
| 环境边界 | 初次详情访问因系统网关 API `403` 被全局跳转 `/errors/403`；临时集群管理员绑定后复验通过。该绑定仅为定位环境权限条件，已清理，不能作为低权限证据                                                                                                                                                                                                                    |
| 清理结果 | Application、相关版本、临时用户、WorkspaceRoleBinding、项目 RoleBinding、临时集群绑定均已删除；`v4-migration-e2e` namespace 保留                                                                                                                                                                                                                                   |
| 当前状态 | A09/A11 调整为“部分验证”；失败、取消、刷新/返回、低权限和完整 V4/Wujie 去依赖仍未闭环                                                                                                                                                                                                                                                                              |

## 2026-10-19 A12 版本上传缺口修复与最新部署状态

真实浏览器验证应用模板版本上传时，发现校验接口返回的应用名和版本名没有进入提交数据，且版本接口要求 `appType: helm`。已按测试先行补充 2 个上传数据回归用例并完成两次最小修复：`0fff169bd` 保留 `appName`/`versionName` 并修复信息页显示，`58de31e58` 补充版本请求的 `appType`。

| 检查项       | 实际结果                                                                                                                                                | 状态     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 本地目标测试 | 上传数据回归测试 2/2；目标文件 ESLint、Prettier、`git diff --check` 通过                                                                                | 已验证   |
| 本地完整检查 | 67 个测试文件、246 个测试通过；`corepack yarn build:packages` 通过                                                                                      | 已验证   |
| CI           | Run `39209219839` 成功                                                                                                                                  | 已验证   |
| 部署制品     | `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`；manifest digest `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17` | 已验证   |
| 131 rollout  | Deployment `523/523`；Pod `ks-console-6dcf5456c4-7tvhx` `Running/Ready`；实际 imageID 与 manifest digest 一致；`/readyz` 通过                           | 已验证   |
| 浏览器复验   | 上传入口、Chart 校验 `200`、版本元数据和刷新路径已重新检查；最终上传 HTTP `200` 和完整成功截图未形成可独立引用证据                                      | 部分验证 |
| 清理         | 临时 Application、ApplicationVersion、账号、绑定和上传文件均已清理；`v4-migration-e2e` 保留                                                             | 已完成   |

A12 仍为“部分验证”。不能把本地测试、CI 或正确请求形态替代最终浏览器成功证据；上传成功、冲突/失败反馈、低权限、V3 Action 移除仍未闭环。全局 P0 继续跟踪，PR #1 保持 Draft，未进入下一模块。

## 2026-10-19 当前制品入口复核与临时资源清理

当前 131 制品为 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`，manifest digest 为 `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`，`ks-console` Deployment `523/523`，Pod `ks-console-6dcf5456c4-7tvhx` 为 `Running/Ready`，实际 imageID 与 manifest digest 一致。

本轮使用真实 Playwright 浏览器完成以下只读或可逆入口核对：

| Action                                       | 结果                                                                                    | 状态         |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| A06/A07 `devops.create/edit`                 | DevOps 页面显示“请选择集群”、总数 0；点击“创建”未形成可用弹窗，缺少企业空间集群 fixture | 未闭环       |
| A09 `app.template.create.v2`                 | “创建 → 从应用模板”抽屉可以打开，但显示“未发现资源”                                     | 部分入口验证 |
| A12 `openpitrix.template.edit.v2` 上传子路径 | “上传版本”弹窗可以打开；点击取消后未产生上传写请求                                      | 部分入口验证 |
| A08 `notification.user.setting`              | 用户菜单没有“通知设置”入口，只有用户设置、登出、关于、技术支持                          | 未验证       |
| A05/A10 边缘应用路径                         | 当前集群没有 Edge/EdgeWorkload API 或 CRD，无法建立选择和批量删除 fixture               | 未验证       |

本轮没有把空数据态、隐藏入口或弹窗打开标记为功能等价通过。检查过程中发现此前安装测试遗留的临时 Application `v4-app-template-20261019`、对应 ApplicationVersion 和 Helm 安装 Job，已按唯一测试名称删除并复核不存在；`v4-migration-e2e` namespace 保留。全部 V3 功能逐项等价性、完整 RBAC 作用域覆盖和扩展运行时错误仍未闭环；扩展错误按负责人指令暂缓。

补充的平台作用域只读核验使用临时用户、GlobalRole 和 GlobalRoleBinding 打开了 `/access/workspaces`、`/clusters`、`/access/accounts`、`/extensions/management` 和 `/settings/base-info`，页面均能渲染。由于 KubeSphere 聚合控制器把全局模板规则展开到了临时角色，本次结果只记为平台入口证据，未执行写操作，也未把它当作最小权限拒绝证据；三个临时 IAM 对象已删除并复核不存在。

## 2026-10-19 A12 上传成功闭环

在镜像 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`、manifest digest `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17` 上，使用真实 Playwright 浏览器上传专用 Chart `v4-action-upload-20261019.tgz`：

| 检查项     | 实际结果                                                                    | 状态   |
| ---------- | --------------------------------------------------------------------------- | ------ |
| Chart 校验 | `POST .../versions?validate=true` 返回 `200`，页面进入应用信息确认态        | 已验证 |
| 版本创建   | `POST .../apps/stakater-configmap/versions` 返回 `200`，响应版本为 `9.9.19` | 已验证 |
| 刷新一致性 | 刷新后版本列表显示 `9.9.19`、状态“未提交”、总数 4                           | 已验证 |
| 清理       | 删除 `stakater-configmap-9.9.19` 后页面恢复总数 3，API 复核资源不存在       | 已完成 |

A12 上传成功子路径已关闭；冲突/失败反馈、低权限、完整返回边界和 V3 Action 移除仍未完成，A12 继续保持“部分验证”。

## 2026-10-19 A12 上传失败反馈修复与最新制品验证

本轮没有启动子 Agent，继续使用单 Codex 会话完成 A12 的真实浏览器复验。根因定位为应用模板版本页实际由远程 `openpitrix` 扩展包提供，之前只修改本地 `PackageUpload` 组件不能覆盖该入口；共享请求层把 `versions?validate=true` 的预期校验失败继续作为 rejected Promise 返回，导致远程入口长期显示“正在上传”。

提交 `6acdc3b2fc52a3264ee58a2bb9270cd630e7dc44` 增加受限的校验错误归一化和请求工具回归测试。`./scripts/test.sh` 通过（68 个测试文件、248 个测试），`corepack yarn build:packages` 通过；GitHub Actions Run `39267930049` 成功。镜像 tag 为 `feature-v4-configmaps-secrets-20261019-222044-6acdc3b2fc52`，manifest digest 为 `sha256:99ca60b78572916ad45342fcc752e7966a8bd6fb57e4db5108acfc6a6e996b20`。

131 部署后曾因 Deployment 原有 `maxSurge=1` 且单节点 CPU 请求达到约 99%，新 Pod 无法调度；已回滚到旧制品确认服务恢复，再在维护窗口使用 `maxUnavailable=1/maxSurge=0` 完成新制品 rollout，最后恢复原 `maxUnavailable=0/maxSurge=1` 策略。最终 Pod `ks-console-7f96d678f-7k64b` 为 `Running/Ready`，实际 imageID 与新制品 digest 一致。

真实浏览器证据：无效 Chart 的校验请求返回 `500`，页面进入“出现错误，请重试”，不再卡在“正在上传”；有效 Chart `v4-action-upload-20261019.tgz`（版本 `9.9.20`）显示上传成功、应用信息并完成版本创建，随后删除专用 `ApplicationVersion` 并确认不存在，版本列表恢复 3 条。该记录只关闭 A12 的上传失败反馈和有效提交子路径，不代表 A12 全量等价，也不关闭全部 V3/Wujie、完整 RBAC 或扩展运行时风险。

## 2026-10-20 平台只读与项目隔离 RBAC 补测

本轮继续使用单 Codex 会话和真实 Playwright，不启动子 Agent。新增平台只读账号和仅项目 viewer 账号两个作用域组合：平台只读账号的工作空间/集群/用户读取页面正常渲染并返回 `200`，创建用户、工作空间、集群均返回 `403`；仅项目账号的项目 ConfigMap GET 返回 `200`、POST 返回 `403`，直达项目路由进入 `/errors/403`。

临时用户、GlobalRole、GlobalRoleBinding、WorkspaceRoleBinding、RoleBinding 和临时凭据已删除并复核不存在。RBAC 矩阵新增了平台只读读写边界和项目独立账号边界，但联邦、DevOps、扩展 Action 和全部 V3 功能逐项等价性仍未闭环。

## 2026-10-20 DevOps RBAC 与环境能力补测

本轮未启动子 Agent。使用临时 `dev-workspace` viewer 和平台管理员通过真实 Playwright 检查 DevOps 页面：页面都能渲染，但集群选择器显示 `host：未安装 DevOps`。viewer 的 DevOps 列表 GET 为 `404`、创建 POST 为 `403`；管理员的列表 GET 和创建 POST 均为 `404`；两种账号均可打开创建弹窗并取消，未产生状态变更。

该证据区分了账号权限和环境缺失：viewer 的 `403` 是 RBAC 拒绝，管理员的 `404` 说明当前集群没有可用 DevOps API/扩展。A06/A07 的成功、失败、刷新、低权限和 V4 原生替代仍未闭环，临时用户和绑定已清理。

## 2026-10-20 联邦项目与 Edge 入口只读补测

本轮保持单 Codex 会话，未启动子 Agent，使用当前 131 部署制品和真实 Playwright 进行只读核验：

- 联邦项目 `/workspaces/test-workspace/federatedprojects` 正常渲染；页面显示没有联邦项目，创建弹窗可打开，`host` 显示为主集群但添加集群按钮禁用；没有提交创建操作。
- Edge 节点 `/clusters/host/edgenodes` 正常渲染空数据态；带 `node-role.kubernetes.io/edge` 选择器的节点请求返回 `200`，当前没有边缘节点。
- 联邦页面实际请求 `/consolev3/dashboard` 和 `dist/v3dist/*`，说明该入口仍存在 V3 兼容加载；现有 API/CRD 盘点没有发现可用于联邦或 Edge 真实 CRUD 的 KubeSphere 资源。

本轮只补齐了入口、空数据态和环境能力证据。A05/A10 的成功、失败、取消、RBAC、刷新返回和 V4 原生替代仍未验证；不把空数据态或入口渲染标记为等价通过。全量 V3 功能等价性和完整 RBAC 作用域矩阵继续未闭环。

## 2026-10-20 活动路由与 Action 统计口径修正

重新核对当前分支后确认，项目 Deployment、StatefulSet、DaemonSet 的活动详情路由由 `packages/console/src/pages/projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/*/Detail/routes.tsx`，活动实现使用原生 Workload Detail；此前记录中引用的 `projects/containers/*/Detail` 文件仍有 Wujie 代码，但当前不在该活动路由导入链上，暂按兼容残留保留。

当前非测试源码的 `useV3action/useV3Actions` 统计为 11 个文件、8 个业务调用文件和 9 个业务 Action 行。历史 P0 记录中的 14 个文件和 11 个业务文件作为当时基线保留，不再用于描述当前活动调用数量。A02～A04 的完整字段、错误态、权限、刷新返回和残留文件清理仍未闭环。

## 2026-10-20 测试 namespace 残留清理

继续运行时复核时发现 `v4-migration-e2e` 仍残留此前应用模板安装和配置历史测试对象，包括测试 Helm release 的 ConfigMap/Secret、应用生成的 `configmapname` 以及配置历史 Secret 链。已按明确测试名称、标签和测试 namespace 删除这些对象，并复核 `kubectl get all,configmap,secret,serviceaccount -n v4-migration-e2e` 只剩系统 `kube-root-ca.crt` 和默认 ServiceAccount。

该项说明此前部分清理记录不完整，已修正为本轮实际状态。后续每轮测试必须同时核对 Helm release、Job、ConfigMap、Secret、历史对象和临时账号绑定；本次没有删除 namespace，也没有修改其他 namespace 或业务资源。

## 2026-10-20 原生 Workload HPA 请求修复

原生 Deployment、StatefulSet、DaemonSet 详情页的浏览器取证发现 HPA 请求地址重复包含 `/apis/`，导致 `/apis/apis/autoscaling/v2beta2/...` 请求持续失败。已在 `getHpaApiVersion` 中统一规范版本路径，并将 HPA Store、资源状态和自动伸缩弹窗切换到该辅助函数；新增回归测试覆盖集群版本未知和已知两种情况。

第一版路径修复部署后，浏览器确认重复 `/apis/apis/` 已消失，但正确的 HPA URL 仍被重复请求并触发 `ERR_INSUFFICIENT_RESOURCES`。根因进一步定位为 `useCacheStore` 每次创建新 setter，详情同步 effect 因依赖变化形成循环；第二版 `useCallback` 修复已提交为 `3ee15af9ad2b`，本地 69 个测试文件、249 个测试通过，`build:packages`、CI Run `39302192970` 均成功。

第二版已部署到 131：镜像 tag `feature-v4-configmaps-secrets-20261020-022516-3ee15af9ad2b`，manifest digest `sha256:27d44f7e001a6c5593ce39a5fbde2cb53dcdcb75959ab3a2f57114ee5b3f25b9`，Deployment `538/538`，Pod `ks-console-7c875999cf-6zw2g` 为 `Running/Ready`，imageID 与 digest 一致。真实浏览器复验 Deployment、StatefulSet、DaemonSet 页面均正常，重复 HPA 请求和 `ERR_INSUFFICIENT_RESOURCES` 均为 0；DaemonSet 的操作菜单、YAML 弹窗和取消路径可用。测试工作负载已清理，namespace 只剩系统 ConfigMap 和默认 ServiceAccount。该修复只关闭 HPA 请求循环缺陷，不改变 A02～A04 的完整等价性、RBAC 或全局 V3/Wujie 状态。

## 2026-10-20 原生 Workload 详情操作补测

在第二版制品上使用真实 Playwright 复核临时 Deployment、StatefulSet、DaemonSet：三类详情页及主要子路由均能渲染；三类“编辑信息”弹窗可打开，StatefulSet/DaemonSet 取消通过，Deployment 提交描述 `v4-a02-verify` 后页面和 Kubernetes API 一致；Deployment 刷新和浏览器返回保持路由与描述；DaemonSet 的“更多操作”、原生 YAML 弹窗和取消通过。临时资源已经删除并复核 namespace 无测试残留。

该补测仍只关闭 A02～A04 的部分原生详情行为，完整 YAML 持久化、所有操作错误态、低权限、回滚/重新创建/删除和 V3/Wujie 残留清理未完成。

补测中的 YAML 自动化输入提交返回 HTTP `400`，但编辑器只更新了活动文本区域，缺少完整 YAML 输入证据，因此不把它记为代码失败或通过；YAML 持久化保持未验证，临时 Deployment 已删除。

## 2026-10-20 A02 YAML 文件导入持久化补测

真实浏览器在临时 Deployment `v4-yaml-verify-20261020-2` 的“编辑 YAML”对话框使用文件导入方式提交合法 YAML，将 `kubesphere.io/description` 从 `yaml-before` 改为 `yaml-after`。提交后详情页显示新值，刷新后仍保持；Kubernetes API 回读注解一致，generation 从 `1` 变为 `2`。测试 Deployment 已删除，namespace 复核只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。A02 的合法 YAML 文件导入、提交、刷新和 API 持久化子路径已取得部署后证据；A03/A04 YAML、非法 YAML、冲突、低权限和完整 V3 等价仍未完成。

## 2026-10-20 A03/A04 YAML 文件导入持久化补测

在 131 当前制品上使用真实浏览器分别对临时 StatefulSet `v4-yaml-statefulset-20261020` 和 DaemonSet `v4-yaml-daemonset-20261020` 的原生“编辑 YAML”入口执行文件导入，将描述更新为 `yaml-after-sts`、`yaml-after-ds`。两个页面提交后显示新值，刷新后仍保持，Kubernetes API 回读注解一致；测试对象已经删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。A03/A04 合法 YAML 文件导入、提交、刷新和 API 持久化子路径已取得证据，非法 YAML、冲突、低权限和完整 V3 等价仍未完成。

## 2026-10-20 A02/A03/A04 Workload 低权限拒绝补测

创建临时 `v4-workload-viewer-20261020`，绑定 `test-workspace-viewer` 与项目 `viewer` 角色后，使用真实 Playwright 登录 131，分别访问临时 Deployment、StatefulSet、DaemonSet 详情页。三类页面均可读取，且没有显示编辑或更多操作入口；浏览器会话内 API 结果均为 GET `200`、POST/PUT/PATCH/DELETE `403`。临时资源、用户、WorkspaceRoleBinding 和项目 RoleBinding 已删除，namespace 清理后只剩系统 ConfigMap 和默认 ServiceAccount。该项补齐 A02～A04 当前项目 viewer 组合的低权限拒绝证据，其他作用域和完整 V3 等价仍未完成。

## 2026-10-20 A02 非法 YAML 错误态补测

使用真实 Playwright 在临时 Deployment `v4-invalid-yaml-20261020` 的原生 YAML 编辑器中导入非法对象。提交收到 `400 BadRequest`，页面展示错误信息并保持编辑对话框，API 回读确认 generation 未变化；临时对象已删除，namespace 无测试残留。A02 非法 YAML 错误反馈和不写入保护已取得部署后证据，A03/A04 与冲突、低权限和完整 V3 等价仍未完成。

## 2026-10-20 当前会话：Workload YAML 并发冲突保护

| 项目        | 结果                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 负责人/模式 | 主 Codex 会话，单会话顺序执行，未启动子 Agent                                                                                                                     |
| 分支/提交   | `feature/v4-configmaps-secrets` / `4042f9570a8edf85e20ce43717c1cdf3b3a4f1bd`                                                                                      |
| CI/制品     | Run `39315775014`；`feature-v4-configmaps-secrets-20261020-040218-4042f9570a8e`；digest `sha256:1c59602033e75e14d60e769e1de25bf16db20e962a9d504ee40f991e5f879878` |
| 131 部署    | `ks-console-6f98cccdf7-jd5kz` 为 `Running/Ready`，Pod imageID 与 digest 一致，rollout 成功                                                                        |
| 浏览器验证  | A02 Deployment YAML 并发修改返回 `409 Conflict`；页面错误提示和编辑弹窗保留，外部 API 变更未被覆盖                                                                |
| 清理        | 临时 Deployment `v4-conflict-fix-20261020` 已删除，未删除测试 namespace                                                                                           |
| 当前结论    | A02 resourceVersion 冲突保护子路径已验证；A03/A04 同路径和全部模块等价性仍未完成                                                                                  |

## 2026-10-20 当前会话：StatefulSet/DaemonSet YAML 并发冲突补测

| 项目       | 结果                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| 验证对象   | `v4-conflict-sts-20261020`、`v4-conflict-ds-20261020`                                                 |
| 浏览器结果 | 两类原生 YAML 提交均收到 `PUT 409 Conflict`，编辑对话框保持打开                                       |
| API 结果   | 外部描述分别保持为 `conflict-external-sts`、`conflict-external-ds`，generation 均保持 `1`             |
| 清理       | 两个临时 Workload 已删除，测试 namespace 保留                                                         |
| 当前结论   | A02/A03/A04 的 resourceVersion 冲突保护子路径均已验证；完整 V3 等价、全量 RBAC 和兼容残留清理仍未完成 |

## 2026-10-20 当前会话：StatefulSet/DaemonSet 非法 YAML 错误态补测

| 项目            | 结果                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| 验证对象        | `v4-invalid-sts-20261020`、`v4-invalid-ds-20261020`                                                      |
| 浏览器/API 结果 | 两类原生 YAML 提交均返回 `PUT 400 Bad Request`；编辑弹窗保持打开，`resourceVersion` 与 generation 未变化 |
| 清理            | 两个临时 Workload 已删除，namespace 只剩系统 ConfigMap 和默认 ServiceAccount                             |
| 当前结论        | A03/A04 非法 YAML 错误反馈和不写入保护已验证；完整 V3 等价、全量 RBAC 和兼容残留清理仍未完成             |

## 2026-10-20 当前会话：Workload operator 正向 RBAC 补测

| 项目            | 结果                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| 验证对象        | 临时 Deployment、StatefulSet、DaemonSet                                                                    |
| 账号/作用域     | 临时 `test-workspace` 成员 + `v4-migration-e2e` 项目 `operator`                                            |
| 浏览器/API 结果 | 三类详情页均渲染；GET/PUT/PATCH/POST/DELETE 均为 `200/200/200/201/200`                                     |
| 清理            | 临时用户、WorkspaceRoleBinding、RoleBinding 和 Workload 已删除，namespace 无残留                           |
| 当前结论        | A02/A03/A04 当前项目 operator 正向边界已验证，与 viewer 拒绝证据形成正反组合；完整 RBAC 和 V3 等价仍未完成 |

## 2026-10-20 当前会话：Workload 作用域 RBAC 补测

| 组合            | 浏览器/API 结果                                              | 清理                                                              | 当前结论                          |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------- |
| `workspaceonly` | 项目详情 `/errors/403`；GET/POST/PUT/PATCH/DELETE 均为 `403` | 用户和 WorkspaceRoleBinding 已删除                                | Workload 没有项目读取权           |
| `clusterviewer` | 项目详情正常；GET `200`，POST/PUT/PATCH/DELETE `403`         | 用户、WorkspaceRoleBinding、ClusterRoleBinding 和 Workload 已删除 | 集群只读可读取 Workload，不能写入 |

A02～A04 当前已补齐 viewer、operator、workspaceonly、clusterviewer 作用域证据；projectonly、独立 admin、平台/联邦/DevOps/Extension 作用域及全量 V3 等价仍未完成。
