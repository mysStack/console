# KubeSphere Console V3 → V4 全量原生化迁移计划

> 状态：恢复模块级执行（全局 P0 风险持续跟踪；ConfigMap、Secret、ServiceAccount 按模块 REA → DEV → VERIFY → PR 推进），实际分支和提交以 GitHub 核验结果为准
>
> 仓库：`mysStack/console`
>
> 已发布稳定基线：`release-4.1.5`
>
> 建议迁移集成分支：`feature/v4-migration`
>
> 目标自维护产品版本：`4.2.0`（暂定；不代表 KubeSphere 上游版本）
>
> 测试环境：`192.168.2.131:30880`（仅经授权后部署）

> **当前执行口径（2026-10-22）：** 本文第 3～8 节为有效规则，下方日期记录为历史事实，不能据此恢复旧的全局 P0 阻塞策略或倒推模块 REA 已通过。Workload 使用 `feature/v4-workloads` / `console-workloads`；当前聚焦 Deployment 编辑设置，阶段为 `REA`、状态为“分析中”。既有原生实现及浏览器场景保留为先行证据，未完成 V3 行为对照前不继续该能力的 DEV/VERIFY。其他模块状态以其分支内经核对的记录为准，不复制本分支旧表格的进度。

### 历史执行与策略调整记录（不作为当前阶段授权）

> 当前执行记录（2026-10-16）：已从 `release-4.1.5` 创建并推送 `feature/v4-migration`；镜像测试 tag 统一使用“分支名-上海时间-commit 短 SHA”格式，例如 `feature-v4-migration-20261016-132633-1634dfb6523d`。项目 ConfigMap/Secret 已完成原生列表、详情、创建、编辑、删除和批量删除验证，并完成一组最小 RBAC/作用域正负校验；完整权限矩阵和跨项目全量隔离仍待补。ServiceAccount 项目/集群列表、项目详情、创建弹窗、路由和项目作用域已完成代码迁移，并已在 131 完成真实创建、编辑、删除、角色修改和一组 RBAC 正负权限验证；完整权限矩阵和 Secret 数据关联仍待补。上述实现和验证均发生在 P2-REA 门禁前，当前只作为先行探索证据保留，不代表 P2 已进入正式开发。最新 ConfigMap/Secret 制品为 GitHub Actions Run `38878257473`，tag `feature-v4-configmaps-secrets-20261016-170820-277e50781a04`，Pod `ks-console-789d5765fd-dsp5v` 使用 imageID `ghcr.io/mysstack/ks-console@sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018`。按已确认的第 12 节顺序，已创建并推送 `feature/v4-configmaps-secrets` 短期分支并创建草稿 PR [#1](https://github.com/mysStack/console/pull/1) 合入 `feature/v4-migration`。原先直接进入集成分支的历史不改写。该记录是历史事实，当前门禁和最新分支状态以 2026-10-17 的复核记录为准。

> 最新文档复核（2026-10-17）：已核验 `origin/feature/v4-migration` 和 `origin/feature/v4-configmaps-secrets` 远程分支存在；`v4.1.5^{commit}` 与 `release-4.1.5` 均核验为 `fc1253cbe`。具体分支 HEAD 以执行时的 Git 远程核验为准，避免文档提交后产生过期 SHA。当前流程从 P0-REA 重新开始，P0-REA 为“分析中”，P1-REA 为“未开始”，P2-REA 为“未开始（历史先行证据）”。详细复核见 `console/docs/v4-migration/document-review-2026-10-17.md`。
> P0 取证执行记录（2026-10-17）：已创建 `console-p0-audit`、`console-p0-rea`、`console-p0-baseline` 三个独立 Worktree 和任务分支，形成静态审计、focused REA、V3 路由入口、V3 模块源码、Git 基线及制品来源证据，统一状态见 `console/docs/v4-migration/agents-status.md`。三个独立 Agent 启动请求因协作服务限流返回 429，首轮证据由协调 Agent 在对应 Worktree 完成；P0 门禁仍未通过，不进入 P1/P2 正式开发。
> P0 取证补充（2026-10-17）：已确认当前 `v3dist` tree `1e499d92e11374e26c76f5e13be45251602bd596` 属于 2025 外部镜像输入；历史带来源元数据的 2026 tree 为 `e6c16ea260a8c32227149135f3f5fe3b5a2c5fc2`，两代之间有 750 个文件变化，不能复用历史 `8843eadf1` provenance。已补充 ConfigMap/Secret/ServiceAccount 字符串库存、旧 V3 Action 行为和历史 commit API 核验；当前仍缺当前外部制品 provenance、131 全量运行时映射和独立 Agent 复核。
> P0 运行时补充（2026-10-17）：在现有 131 Pod `ks-console-789d5765fd-dsp5v`（imageID `ghcr.io/mysstack/ks-console@sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018`）上完成只读 Playwright 取证；确认项目菜单、原生资源详情 Tab、代表性 Wujie frame、直达/刷新/返回和 Network 请求，记录扩展初始化错误、独立 `/consolev3/dashboard` 空 body 以及扩展计数不一致。详见 `console/docs/v4-migration/p0-runtime-evidence.md`，Evidence ID `ev_local_p0_runtime_20261017_131_01`。P0-U003 已推进到“分析中”，P0-U001/P0-U002/P0-U004 和独立复核仍未关闭，P0 门禁不通过。
> P0 门禁材料（2026-10-17）：已新增 `console/docs/v4-migration/p0-gate-review.md`，按 Git 基线、静态盘点、旧源码、REA、运行时、扩展、独立复核和负责人签署逐项列出结论；当前为“待复核/未通过”，不进入 P1/P2。

> 流程调整（2026-10-17）：全局 P0-U001～P0-U004 继续保留并持续跟踪，但不再阻塞所有模块的 V4 开发。每个模块必须独立完成 `模块-REA → 模块-DEV → 模块-VERIFY → 模块-PR`；模块内影响功能正确性或安全性的高风险未知项仍然阻塞该模块。ConfigMap、Secret、ServiceAccount 的既有实现作为待复核基础，本轮从它们的模块级缺口收尾开始，不重新初始化项目、不重复全量 REA。

> 原生重构执行计划（2026-10-21）：后续以 `console/docs/superpowers/plans/2026-10-21-v3-to-v4-native-migration.md` 为执行清单。使用旧 V3 源码整理行为、用当前 `v3dist` 的 REA 结果校准差异、复用现有 V4 Store/组件完成重构，并在 131 完成构建制品到 Playwright 的完整验收链路。当前先处理项目 Deployment、StatefulSet、DaemonSet 列表；DevOps、KubeFed、KubeEdge、Notification 作为后续插件对接范围，不安装、不配置、不作为核心模块统一阻塞。

## 1. 项目目标

在保留 KubeSphere Console 当前业务能力和已有二次开发成果的前提下，逐步替换所有运行时 V3 / Wujie 依赖，交付 **100% V4 原生 Console**。**不能通过移除现有功能、留下空白页面或保留隐藏的 V3 弹窗来宣称迁移完成。**

最终要求：

- 所有启用的页面及资源操作都由 V4 React 组件承载；项目、集群、工作空间、联邦项目和扩展模块覆盖完整。
- 删除对 `/consolev3`、`v3dist`、`wujie-react`、`ConsoleV3ResourceList`、`ExtensionConsoleV3Embed`、`useV3action` 等 V3 运行时的依赖（在全量验收后执行）。
- 继续使用现有 API、RBAC、多集群与 namespace 隔离规则；保障 ConfigMap/Secret 配置历史、Deployment 配置引用等二次开发功能。
- 无功能回退、无新增严重安全问题，浏览器前进/后退、直达 URL、刷新、数据一致性及生产运维关键操作均通过验收。

## 2. 当前基线与已知事实

- 现有 `console` 已以 V4 React、React Router 6、React Query 3、Kubed、共享 Store 为核心，**不是重建一个新 Console**。
- 项目级多个列表通过 `ConsoleV3ResourceList` 嵌入 V3，部分详情页通过 `WujieReact` 渲染；ConfigMap/Secret 原生详情已在原 `feature/config-history` 开发线上实现，并已合入 `release-4.1.5`。该短期分支的本地和远程引用已删除，后续以发布基线和提交 SHA 追溯。
- 部分集群级 V4 列表或详情源码存在，但实际路由仍指向 V3 Embed，必须验证可用性后复用。
- V3 以 `packages/bootstrap/assets/v3dist` 编译产物存在；当前工作区没有名为 `kse-console-v3` 的独立源码目录，但同一 Git 仓库保留 `origin/release-3.2`、`origin/release-3.3`、`origin/release-3.4` 三个 V3 源码候选引用（最新 `origin/release-3.4` 为 `175710fefeeba6ff295c2c0967b4d45b83563d26`，许可证 `AGPL-3.0`）。当前 P0 基线制品目录最近的 Git 更新提交为 `3f3064787042a95792b591f4aea4231ea7988bb0`，提交信息指向外部镜像标签 `kse-console-embed:kse-release-4.1` → `kubesphere/console:release-4.1`；历史分支曾携带 `.v3dist-source.json`，指向 `mysStack/kse-console-v3` 的 `feature/v3-artifact-decouple` / `8843eadf1`，但该元数据属于另一代 2026 tree，不在当前 P0 制品中。当前 P0 制品 tree 为 `1e499d92e11374e26c76f5e13be45251602bd596`，与历史 `e6c16ea260a8c32227149135f3f5fe3b5a2c5fc2` tree 有 750 个文件变化；当前外部镜像对应的旧 V3 源码 commit 仍未知。目录未检出 `.map` 文件的证据，不能承诺原样恢复源码。
- 前期静态审计记录了 V3/V4 路由同步、Wujie 生命周期、QueryClient 缓存、权限 Query Key、V3 专属编辑弹窗等待核对项。
- 这些内容只作为本轮 REA 的分析输入，不作为当前完成度或风险结论；迁移重新开始时须核对**最新 Git 提交**与部署版本。
- 当前已核验（2026-10-16）：`console` 的 `v4.1.5^{commit}` 和 `release-4.1.5` 均指向 `fc1253cbe`；原 `feature/config-history` 末提交 `2656419bc` 已在该发布基线历史中；`feature/v4-migration` 已创建并跟踪远程分支。`1634dfb65` 仅作为 ServiceAccount 先行实现的历史提交记录，不代表当前集成分支 HEAD。

## 3. 仓库与分支策略

继续使用 `mysStack/console` Monorepo，不创建独立 `console-v4` 仓库，也不复制一份 `packages/console-v4`。

```text
release-4.1.5                 已发布稳定分支（只接收经过审批的维护修复）
  └── feature/v4-migration    长期 V4 迁移集成分支（以核验后的已发布提交为基线）
       ├── feature/v4-resource-framework
       ├── feature/v4-configmaps-secrets
       ├── feature/v4-workloads
       ├── feature/v4-storage-network
       └── ...（按模块短期分支 / PR）
release-4.2.0                 全量验收通过后再创建的发布分支（名称暂定）
```

**执行前检查（阻塞项）：**

1. 核对 `release-4.1.5` 是否存在、对应发布标签与 commit SHA，并确认 `feature/v4-migration` 是否已由其他任务创建。
2. 确认原 `feature/config-history` 末提交 `2656419bc` 已进入 `release-4.1.5`；该分支已删除，后续使用发布基线的 Git 历史和 SHA，不再依赖已删除的分支名。
3. 对仍未进入发布基线的改动先形成保留/排除清单，确认适当的 cherry-pick 或合并范围，不直接引入未经验证的整条开发线。
4. 如目标分支已经存在，检查保护规则、工作区是否有未提交改动；**不强推、不覆盖、不改已发布基线**。
5. 每阶段在短期分支开发，测试后提交 PR 并合入迁移集成分支；稳定版本维护修复按需向迁移分支同步。

当前核验结果：`feature/v4-migration` 已存在并跟踪远程分支；`feature/v4-configmaps-secrets` 已创建并推送，草稿 PR [#1](https://github.com/mysStack/console/pull/1) 已指向 `feature/v4-migration`。2026-10-22 发现 Workload 错误沿用 ConfigMap/Secret 分支，现已从远程迁移基线 `3e09afd6a` 创建并推送 `feature/v4-workloads`，独立 Worktree 为 `/home/bruce/code/ks-develop/console-workloads`；历史代码尚待逐项归集和重新验证，不改写原分支历史。`feature/v4-resource-framework`、`feature/v4-storage-network` 及其他后续模块分支只在对应模块开工前按注册表创建。后续模块必须先通过模块门禁，再进入 REA/DEV/VERIFY/PR。

### 3.1 所有后续模块的强制执行门禁

本节自 2026-10-22 起适用于 Workload 及之后所有模块。完整规则、模块边界及命令见 `/home/bruce/code/ks-develop/v4-module-execution-rules.md` 和 `v4-module-branch-registry.json`。

1. **先登记再开工：** 模块必须先在注册表中明确模块 ID、能力边界、短期分支、Worktree 和 PR 目标。未登记的模块不得修改代码。
2. **分支隔离：** 模块分支在开工时从实时核验的远程 `feature/v4-migration` 创建。禁止直接在 `release-4.1.5`、`feature/v4-migration` 或其他模块分支开发。
3. **阶段顺序：** 每个模块独立执行 `REA → DEV → VERIFY → PR`。模块 REA 文档与代码位于同一模块分支；未完成当前阶段交付，不进入下一阶段。
4. **命令门禁：** 修改前执行 `scripts/v4-module-gate.py <module> start`；提交、部署、PR 前分别执行 `commit`、`deploy`、`pr` 检查。任何失败都必须先修正分支、工作区、远程同步或证据问题。
5. **共享代码边界：** 通用 Store、路由、缓存、RBAC、公共组件等底座改动优先进入 `feature/v4-resource-framework`。模块确需修改共享代码时，必须在模块范围记录中说明调用方、回归范围和后续归属，不得夹带其他业务模块。
6. **证据不跨版本继承：** 其他分支的测试、CI、镜像、Pod 和浏览器结果保留为历史输入。当前模块必须对自己的 Git SHA 完成测试、构建、镜像、131 rollout 和 Playwright 链路后，才能标记 VERIFY 通过。
7. **独立 PR：** 每个模块使用独立 PR 指向 `feature/v4-migration`。PR 保持 Draft，直到模块验收材料完整并由负责人复核；不自动合并。
8. **冲突先改文档：** 用户最新明确指令优先，其次为本主计划，再次为模块执行规则/注册表、模块实施计划、状态与历史证据。发现冲突时先停止编码并修正低优先级文档；长期策略变化必须先更新本主计划。

### 3.2 REA 完成条件与门禁检查边界

- **固定交付范围：** 每次明确模块与当前能力，例如 Workload / Deployment 编辑设置。先列出现有 V3 的页面分区、字段、默认值、校验、Action、API/Store、RBAC、作用域、缓存、路由和错误行为，再对照 V4；不能只按新表单已经实现的字段生成测试。能力拆分不得把遗漏功能排除出模块总清单，范围改变必须重新评估证据。
- **三类输入分开：** 旧 V3 源码是结构参考；当前 `v3dist` 的 REA 是制品证据；真实 V3 页面、Network 和 API 是运行时行为证据。记录实际观察、静态推断和未知项，不把 `release-3.4` 当作当前制品完整源码。
- **足够证据的定义：** 当前能力的行为矩阵完整、结论可追溯、影响正确性/权限/数据保留的高风险未知项已经关闭或经复核明确隔离。不要求恢复整个 V3 原始源码，也不要求 REA 大型语义图达到无截断；`partial`、`no-match` 需要逐项解释影响，既不自动放行，也不自动阻塞无关能力。
- **唯一当前状态：** 模块分支维护 `docs/v4-migration/module-execution.json`，记录模块、能力、当前阶段、REA 状态、源提交、V3 tree、带摘要的证据文件、覆盖维度、未闭环高风险项和复核依据；`rea-analysis-summary.md` 为该分支索引。人工文档的当前状态必须与之相同，历史快照放在明确标记的历史区。
- **脚本检查边界：** `start/commit/deploy/pr` 是检查时机，`REA/DEV/VERIFY/PR` 是业务阶段，两者不可混用。脚本核查 Git 身份、阶段记录、证据完整性与摘要，不能判定证据内容真实或代替已有规范要求的指定复核。输出必须分别说明，禁止笼统声称“模块门禁通过”。
- **防止跳阶段：** REA 阶段只允许记录和证据整理提交，不允许业务代码提交或部署。进入 DEV/VERIFY 必须有当前能力的完整 REA 覆盖、证据摘要、V3 版本绑定和已有规范要求的复核依据；不得自行填写签署。文档与门禁工具的修复使用明确的 `--records-only` 通道，仅允许约定的记录/治理工具路径，不能夹带业务代码或授权部署。
- **现有验收不降低：** 代码检查、本地测试、CI 成功都不能替代构建制品、131 rollout、Pod imageID 和新浏览器 Playwright 的完整链路；模块完整验收和负责人复核要求仍保留。

## 4. REA + Codex 逆向与迁移工作流

REA 作为**功能取证与逆向辅助**，Codex 负责 V4 实现；Dot/Work 负责阶段计划和进度跟踪（具体工具调用以实际环境支持为准）。

### 4.1 逆向输入

- 当前 V3 `v3dist` 的 JS Chunk、manifest、静态资源。
- 能找到的合法旧版开源 Console 源码/历史 Fork（必须核对版本、来源与许可证），用于结构参考，不能假设与编译产物完全一致。
- 现有 V4 代码、真实测试环境中**脱敏**的 Network 请求、页面行为和操作截图。

### 4.2 试点顺序和 Deployment 证据包

之前本节把 Deployment 写成首个试点，与 ConfigMap/Secret/ServiceAccount 的现有实现和当前收尾优先级冲突。现行顺序调整为：全局 P0 风险持续跟踪；先对 ConfigMap、Secret、ServiceAccount 分别完成模块级 REA，再按模块推进 DEV、VERIFY 和 PR。Deployment 文档继续作为逆向输入，进入 Deployment 前仍需完成 Deployment 自身的模块级 REA，不能用其他模块的证据替代。

依次还原：

1. 列表 → 详情、详情 Tab、深链接、浏览器历史导航及宿主/子应用路由关系。
2. API 的 method、path、query/body、响应结构、调用场景；区分 list/detail/watch/patch/update/rollback/scale/restart。
3. Store 的初始化、缓存、数据转换、状态更新、列表失效和 Watch/轮询行为。
4. 编辑 YAML/基础信息/容器模板、伸缩、回滚、重启、删除等操作链；记录确认弹窗与权限校验。
5. 对照当前 V4 Workloads/Detail/Store/Modal 代码，标注：**可直接复用 / 需改造 / 需新建 / 未确认**。

**每个发现都必须附证据：** V3 Chunk 文件和定位、旧源码位置（如适用）、V4 文件路径、浏览器请求或测试记录，并标注“已验证 / 静态推断 / 待实测”。

> 逆向不等于自动恢复原始 TSX。不得输出真实 Token、Secret、Kubeconfig 或敏感业务数据；不得把机密凭据提交到仓库。

### 4.3 Deployment 逆向阶段交付

- `docs/v4-migration/deployment-v3-evidence.md`：路由、API、Store、操作调用链。
- `docs/v4-migration/deployment-gap-matrix.md`：V3 功能与 V4 对应文件、缺口和测试场景。
- 待开发事项拆分为可独立评审的 PR，而非直接一次性替换整个 Deployment。

## 5. V4 技术方案

- **复用优先：** `packages/core`、`packages/console`、`packages/shared`、现有 `ListPage`、`DataTable`、Store、`useCommonActions`、Kubed UI，不整体换框架。
- **统一作用域：** 对 cluster / workspace / project(namespace) / federated scope 建立明确的数据与权限边界；集群级跨 namespace、项目级固定 namespace。
- **统一资源生命周期：** list、detail、action、query key、缓存失效、事件/监控更新和路由状态恢复标准化。
- **权限安全：** 缓存按登录用户、集群、workspace、namespace、资源与查询参数区分；登出、权限变化、资源修改时正确失效，不跨权限展示旧数据。
- **兼容期间：** 可暂时保留 V3 桥接，但新迁移模块必须逐步脱离；禁止为赶进度用 `alive=true` 掩盖子路由不同步。
- **V3 退出条件：** 所有生产需要的 V3 功能具备 V4 替代，并通过回归后才删除 V3 资源和 Wujie 依赖。

## 6. 分阶段执行清单

| 阶段 | 范围                                                     | 先行 REA 交付                                                                                  | 开发与验收交付                                         | 开工/完成关卡                                                              |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| P0   | 基线与依赖风险持续跟踪                                   | 分支差异、旧 V3 源码基线、全部路由/Wujie/`useV3action` 依赖、WSL REA 集成、Deployment 逆向输入 | 维护风险清单、证据和矩阵，不作为所有模块的统一开发阻塞 | P0 风险在全局持续跟踪；模块内命中的高风险未知项仍阻塞对应模块              |
| P1   | V4 资源公共底座                                          | 作用域、权限、缓存、列表/详情和返回恢复的 V3 行为证据                                          | 公共底座实现与隔离回归                                 | 公共底座模块 REA 完成并复核后才能修改；验收通过后提交独立 PR               |
| P2   | ConfigMap、Secret、ServiceAccount                        | 每个模块分别完成旧 V3 参考、REA 静态/运行时、API/Action、RBAC、脱敏、批量操作和作用域矩阵      | 原生列表、详情、创建、编辑、删除、批量操作和配置历史   | 每个模块独立执行 `REA → DEV → VERIFY → PR`；一个模块通过不代表其他模块通过 |
| P3   | Deployment、StatefulSet、DaemonSet                       | 逐模块完成旧 V3 行为和关键运维 Action、API、权限、缓存证据                                     | 列表/详情/编辑/伸缩/回滚/重启/配置引用                 | P3-REA 完成后才能开发；关键运维操作无需 V3 Action 且部署验收通过           |
| P4   | Pod、Service、Ingress、Job、CronJob                      | 日志、终端、资源状态、端口/路由、执行历史、触发/暂停等 V3 对照证据                             | 原生功能逐项实现                                       | P4-REA 完成后开发，逐项等价且无数据串用后关闭阶段                          |
| P5   | Storage、NetworkPolicy、告警、监控等                     | PVC/PV、快照、网络规则、告警和监控的 V3 行为与权限证据                                         | 原生资源和必要可视化                                   | P5-REA 完成后开发，所有启用功能部署回归通过                                |
| P6   | Gateway、ImageBuilder、SpringCloud、应用编排、工作空间等 | 复杂业务模块的旧源码、运行时流程、RBAC 和错误态证据                                            | 复杂业务模块原生化                                     | 每个模块完成 REA 关卡后才能开发，功能/操作/RBAC/错误态完整                 |
| P7   | 联邦项目、DevOps、Telemetry、平台及扩展                  | 跨集群、平台配置、扩展路由和操作的实际行为证据                                                 | 跨集群、平台及扩展迁移                                 | 逐模块 REA 完成后开发，对照生产功能矩阵逐项通过                            |
| P8   | 移除 V3/Wujie，候选版发布                                | 全量运行时入口、Network、依赖和构建引用复核                                                    | 删除遗留依赖、清理构建与路由、全量联调                 | 所有模块正式验收后才能删除 V3/Wujie，并创建 `4.2.0` 候选                   |

全局风险阶段与模块开发阶段分离。全局 P0 未完成时，仍不得宣布项目整体完成、删除 V3/Wujie 或创建最终发布分支；但不再阻塞已经具备模块级 REA 依据的模块。每个模块必须先完成自身的 `模块-REA`，再进入 `模块-DEV → 模块-VERIFY → 模块-PR`；既有实现只能作为该模块的输入和先行证据，不能自动替代模块级 REA 或 VERIFY。

每个阶段的 REA 结论必须写入迁移仓库的分析总结文档，至少包含目标版本或制品摘要、证据 ID、观察结果、推断、限制、未知项、关闭条件和门禁结论。当前统一索引为 `console/docs/v4-migration/rea-analysis-summary.md`；模块级细节可拆分为独立文档，但必须回链到该索引。

P0 的 Dependency Inventory 必须扫描直接 `<WujieReact>`、间接 `ConsoleV3ResourceList`/`ExtensionConsoleV3Embed`、动态 V3 Action、`/consolev3` 字符串、静态资源、运行时事件总线、权限路由、扩展插件与构建脚本。不要把“找不到显式 Wujie 标签”误认为无 V3 依赖。

## 7. 开发任务规范（每个模块）

1. **Baseline：** 对照现有 V3 功能，列出 UI、API、校验、RBAC、异常处理、事件、表单、批量操作、监控/日志能力。
2. **Evidence：** 在开发前完成旧 V3 源码参考、REA 静态分析、运行时行为、API/Action、RBAC、缓存和作用域对比，标明证据及未知点；高风险未知点未关闭时不得进入 Implement。
3. **Implement：** 仅在该模块 REA 门禁通过后，优先改造现有 V4 组件和 Store；遵守类型、路由、错误态与数据安全约束。全局 P0 风险继续记录，不因模块开始开发而被标记为关闭。
4. **Tests：** 单测、lint、类型诊断差异、浏览器 E2E；基线存在的 TS 错误单独登记，但不得新增回归。
5. **PR Review：** 只有对应阶段的 REA 证据、实现、测试和部署验收齐全后才能提交正式 PR；列明变更路径、功能对照、截图/Network 证据、性能、回滚方案和已知限制。
6. **Deploy：** 仅授权的 131 测试环境；生产部署需单独批准。
7. **Close：** 迁移矩阵中模块由 `未开始 → 分析中 → 开发中 → 测试中 → 已验收`，必要时标记为 `阻塞`；只有通过正式验收才能标记完成。

## 8. 测试与验收标准

- **路由：** 从列表进入详情、返回、前进、直接访问、刷新、不同 Tab 与跨资源导航均正常；不得出现空白页。
- **数据：** 切换用户/集群/namespace 不串数据；列表编辑后更新、删除后消失；缓存隔离与失效正确。
- **操作：** Deployment 伸缩、回滚、重启、YAML、容器编辑；Pod 日志/终端；Job 触发；PVC/快照；配置历史与配置引用全部覆盖。
- **权限：** RBAC 与 UI 操作授权一致；没有前端缓存泄漏；Secret 继续脱敏。
- **性能：** 与迁移前的 131 基线比较首屏、返回、API TTFB 和 P50/P95；不预设“前端原生化一定提升后端 API 性能”。
- **质量：** `./scripts/test.sh`、格式检查、`git diff --check`、构建、变更范围相关 TypeScript 检查和浏览器 E2E 均通过；已有编译错误必须对比基线。
- **依赖清理：** 静态扫描零遗留 V3 运行时引用；运行时 Network/路由/功能测试确认不再使用 `/consolev3`；依赖锁与构建产物同步清理。

### 8.1 项目 namespace 作用域防漏测门禁

项目级资源页面必须把路由中的 `:namespace` 作为固定作用域；集群级页面才允许选择和查看多个 namespace。页面能够渲染不等于作用域验证通过，以下证据必须同时满足：

1. **代码测试：** 项目路由下的 `ListPage` 隐藏跨项目选择器，资源 Store 使用当前 namespace 的 namespaced URL，创建弹窗锁定当前 namespace；集群路由继续保留全量选择器。
2. **跨 namespace 数据：** 使用至少两个测试 namespace 的哨兵资源验证，项目页面只能显示当前 namespace 的资源，不能用只有一个 namespace 数据的场景代替隔离验证。
3. **浏览器页面：** 直接访问、刷新、浏览器返回后，页面不出现“全部项目”，所有可见资源的项目列必须等于路由 namespace。
4. **Network 请求：** Playwright 或等效浏览器证据必须确认 ConfigMap、Secret 等 namespaced 资源请求包含当前 namespace；不能只检查表格文字。
5. **制品身份：** 必须完成“构建镜像 → 部署测试环境 → rollout 成功 → Pod imageID 与本次 digest 一致 → 新浏览器上下文登录 → 页面验收”的完整链路。
6. **失败即阻塞：** 登录失败、测试账号变量缺失、请求作用域无法确认、跨 namespace 资源可见或刷新/返回后作用域变化时，模块保持“测试中”或“阻塞”，不得标记为“已验收”。

浏览器测试使用专用测试账号或 CI Secret；不得把密码写入文档、测试配置、截图或日志。测试启动时必须显式检查账号变量和登录结果；禁止使用已有登录会话替代本轮独立登录验证。

## 9. 风险与防护

本节是后续 REA 和验收的检查清单。上一轮流程产生的实现、测试和部署问题已经归档，本轮不沿用上一轮模块状态；是否需要处理某项，只能由当前阶段的证据和复核结果确定。

| 风险                                | 防护                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| 无 V3 原始源码、Chunk 无 source map | REA + 合法旧源码参考 + 浏览器行为取证；未知功能不得臆造         |
| V3 页面存在隐藏的模态框和 API 操作  | 功能矩阵覆盖菜单项、批量操作、异常态、权限差异                  |
| V3/V4 同名子应用路由竞态            | 迁移中隔离生命周期，杜绝未验证的激活/销毁补丁                   |
| 多集群/多 namespace 数据串用        | query key、缓存、Store 按完整作用域隔离，跨作用域回归           |
| 迁移分支持续落后稳定修复            | 定期合入经过审核的 hotfix，记录冲突与版本                       |
| 功能完整性难以证明                  | V3 对照清单、E2E、操作演示和责任人验收，不允许“空白 Tab 即完成” |
| 长期任务丢失上下文                  | 在仓库内持续维护迁移矩阵、实施记录、决策日志与 PR 链接          |

## 10. 初步成本与里程碑

此前的静态评估将核心 Kubernetes 资源迁移量级估为 **120–200 人天**、全量移除 V3 估为 **约 290–520+ 人天**（传统工程工作量范围，并非 AI 运行时长或交付承诺）。实际需由 P0 盘点和 P2 试点重新校准；AI/REA 可加快功能梳理和代码编写，但不能取消真实环境回归。

建议交付的两个证据里程碑：

- **M1：P0/P1 基线与 Deployment 逆向证据包**——当前已生成路由、API、Store 和缺口文档，但 V3 Action 清单、131 Network、RBAC、缓存隔离和浏览器操作矩阵仍未完成，不能视为 M1 完成。
- **M2：P2-REA 与 ConfigMap、Secret、ServiceAccount 试点**——已有先行实现和 131 验证记录，但完整旧 V3 对照、REA、权限矩阵、跨作用域隔离和正式 P2-VERIFY 仍未完成，不能视为 M2 完成。

M2 完成后，以实际 PR 改动、测试缺陷、回归工时重新估算 P3–P8；最终发布日期必须依据能力覆盖率而非固定日历确定。

## 11. 记录模板

在 `docs/v4-migration/matrix.md` 维护迁移矩阵。每行最少记录：

```text
模块 | V3 路由 | V3 操作 | V4 对应代码 | 缺口 | REA 证据 | 负责人/执行器 | 状态 | 测试链接 | PR
```

每次进展更新记录：检查的 Git SHA、已提交 PR、已运行的测试和结果、未验证的假设、下一阶段阻塞项。

每份阶段文档还必须记录：文档更新时间、事实截止时间、源代码 commit、制品 tag/digest、运行环境、证据 ID、复核人、复核日期和门禁结论。若源代码、制品或部署版本变化，旧证据只能作为历史记录，不能直接用于当前门禁。

任何模块内高风险未知项未关闭、证据之间存在冲突、部署制品身份无法回读或测试环境权限不满足时，该模块保持“分析中”或“阻塞”，停止进入该模块下一阶段，不用代码实现结果反推分析完成。全局 P0 风险单独维护，不因某个模块通过而关闭。

阶段状态统一使用 `未开始`、`分析中`、`待复核`、`已通过`、`不通过`、`阻塞`；历史实现、测试和部署只能作为“先行证据”附加说明。`不通过` 和 `已通过` 都必须由项目负责人或指定复核人正式确认，执行者不得自行宣布门禁结论。

## 12. 立即执行（下一次开发会话）

> 本节的已勾选项包含此前已经发生的历史试验。它们只保留事实和验证证据，不改变全局 P0 风险结论；现行执行按模块完成 `模块-REA → 模块-DEV → 模块-VERIFY → 模块-PR`，历史实现不倒推为模块 REA 或 VERIFY 已完成。

- [x] 查验 `release-4.1.5` 的发布标签/提交、原 `feature/config-history` 的合入状态和 `feature/v4-migration` 是否已存在；当前发布基线为 `fc1253cbe`，迁移集成分支已创建并跟踪远程分支。
- [x] 确认原 `feature/config-history` 的末提交 `2656419bc` 已进入发布基线；当前没有需要从该分支另行保留的未发布提交，相关分支引用已删除。
- [x] 在迁移分支新增 `docs/v4-migration/matrix.md`，完成一级功能/路由/V3 依赖扫描；同时生成 `dependency-inventory.md`。
- [ ] 在 WSL 中验证 REA 与 Codex 集成，保留现有 Codex 会话和密钥配置，测试不修改生产。
- [x] 完成 `packages/bootstrap/assets/v3dist` 第一轮 REA 制品分析并记录证据与限制，详见 `console/docs/v4-migration/rea-analysis-summary.md`；该轮结果为部分覆盖，不代表 P0-REA 门禁通过。
- [ ] 持续跟踪 P0-U001～P0-U004：固定 V3 源码候选与当前 `v3dist` 制品边界，补充全局路由、V3/Wujie、动态 Action、扩展和构建入口证据；P0 未完成时不宣布全局迁移完成、不删除 V3/Wujie、不创建最终发布分支，但不再统一阻塞已经通过模块级 REA 的开发。
- [ ] 完成公共底座模块 REA：形成作用域、RBAC、缓存和返回恢复矩阵；该模块自身 REA 通过前不修改公共底座。
- [x] 生成 Deployment 的路由、API、Store、编辑/伸缩/回滚证据与 V4 差异矩阵，文件为 `docs/v4-migration/deployment-v3-evidence.md` 和 `deployment-gap-matrix.md`。
- [ ] 分别完成 ConfigMap、Secret、ServiceAccount 的模块级 REA：旧源码参考、静态/运行时证据、Action/API、RBAC、脱敏、批量操作、Secret 关联和作用域矩阵；未完成的模块继续保持“分析中”或“阻塞”。
- [ ] 当前批次按 `ConfigMap-REA → ConfigMap-DEV → ConfigMap-VERIFY → ConfigMap-PR`、`Secret-REA → Secret-DEV → Secret-VERIFY → Secret-PR`、`ServiceAccount-REA → ServiceAccount-DEV → ServiceAccount-VERIFY → ServiceAccount-PR` 顺序推进；一次只处理一个模块，已有实现和 Draft PR 作为输入，不改写历史。
- [x] 启动 ConfigMap/Secret 原生列表试点，提交 `ac99e46ae`；本地回归、131 构建、部署、rollout 和列表/详情 Playwright 验收已完成，记录见 `docs/v4-migration/config-secrets-131-acceptance.md`。
- [x] 补齐 ConfigMap/Secret 原生创建弹窗，提交 `28a1635b3`；第二轮 131 制品已验证两个创建弹窗可打开和取消。
- [x] 完成 ConfigMap/Secret 真实创建、编辑、删除、批量删除和一组最小 RBAC/作用域正负复验；完整权限矩阵和跨项目全量隔离回归仍待补，完成后再标记 M2。
- [x] 启动 ServiceAccount 原生迁移，提交 `02df82f09`；移除项目和集群列表/项目详情的 V3 入口，补齐原生创建弹窗。
- [x] 修正项目 ServiceAccount 详情路由大小写并按项目 namespace 查询列表，提交 `1634dfb65`；Run `38855707450` 制品已部署到 131，列表、详情、创建弹窗、集群路由和项目作用域已完成 Playwright 验收。
- [x] 完成 ServiceAccount 真实创建、编辑、删除、角色修改和一组 RBAC 正负权限复验；完整权限矩阵和 Secret 数据关联仍待补，完成后再标记 M2。
- [x] 已为 ConfigMap/Secret 创建并推送 `feature/v4-configmaps-secrets`，已创建草稿 PR [#1](https://github.com/mysStack/console/pull/1) 合入 `feature/v4-migration`，当前等待评审。
- [ ] 每个模块开工前先创建并登记短期分支和 Worktree；在该分支依次完成自身 REA、DEV、VERIFY，再整理独立 PR 指向 `feature/v4-migration`。已有提交不改写历史，Draft PR 不代表模块门禁通过。
- [x] 已补充项目 namespace 作用域防漏测门禁：跨 namespace 哨兵数据、选择器状态、namespaced Network、刷新/返回、制品身份和独立登录均为模块 VERIFY 必填证据；相关漏测复盘见 `console/docs/v4-migration/matrix.md` 和 `console/docs/v4-migration/agents-status.md`。
- [x] 已将上一轮 ConfigMap/Secret/ServiceAccount 实现、测试、部署和 Draft PR 标注为先行证据；本轮以模块级 REA 复核后继续收尾，不将历史实现自动标记为模块验收完成。
- [x] 已完成本次执行策略调整：全局 P0 风险持续跟踪，模块按 `REA → DEV → VERIFY → PR` 独立推进；Deployment 证据包继续作为逆向输入，正式开发前必须完成 Deployment 自身模块级 REA。

**完成定义：** 当所有实际启用的 V3 能力都由 V4 原生实现，全部功能验收通过，运行时与构建时已无 V3/Wujie 依赖，才将全量迁移标记为 Done，并创建最终发布候选。
