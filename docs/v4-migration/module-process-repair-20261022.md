# 模块执行流程修复记录（2026-10-22）

## 问题与修改边界

本次经负责人“帮我修复”授权，修复已确认的文档、阶段管理和门禁工具缺陷。业务输入提交为 `36ae2216167ae27561c05e37e5157df0da322de8`，修复前记录提交为 `87df0e024ea93333a2352fc92907007b86f5e33b`。本批不修改业务功能、稳定分支、集成分支或测试环境；不创建子 Agent，不重写历史。

旧脚本只检查 Git/Worktree，却输出“模块门禁通过”；没有检查模块 REA、能力范围和证据状态。旧记录还混用了当前阶段与多个历史限定验证，缺少本分支 REA 索引。结果是先写简化表单，再按已有字段测试，遗漏当前 V3 的功能对照。

## 实际修复

- 主计划新增第 3.2 节，明确能力范围、三类输入、REA 完成条件、阶段记录和脚本能力边界，保留全局 P0 持续跟踪策略。
- 根目录执行规则和 AGENTS 补充阶段与检查时机的区别；纠正“完成后再建分支”的旧清单，与开工前独立分支规则一致。
- 建立本分支的 `module-execution.json` 和 `rea-analysis-summary.md`；当时为 `workloads / deployment-settings / REA / 分析中`，未签署任何通过结论；后续组合范围调整见本文末尾的日期记录。
- 新增编辑设置 22 类候选能力清单及逐字段展开模板。所有 V3 行为保持待核对，不把 Kubernetes 可配置字段冒充 V3 已有 UI 功能。
- 当前阶段与历史代码/测试/镜像记录分开；既有观察保留其原版本，不能反推 REA 已通过。
- 门禁检查阶段冲突、REA 覆盖、高风险未知项、源提交/V3 tree、证据 SHA-256 与暂存内容、复核依据、前置 DEV/VERIFY 记录；提交检查同时包含工作区和暂存区。
- REA、VERIFY、PR 阶段禁止业务改动提交；修复代码必须在合法 DEV 阶段完成，后续重新验证。REA 不部署；`--records-only` 只允许记录/治理路径和 Draft PR 材料更新。
- 根目录不属于 Git 仓库，生效文件在原路径修改，精确版本归档到 [governance](./governance/README.md)；未初始化新仓库。

## 测试与检查

按测试先行执行隔离 Git 回归：初版 10 个用例在旧脚本上暴露 13 个失败断言，包括缺记录仍放行、未复核仍可 DEV、REA 可提交业务代码/部署、暂存区空白错误未检查。随后补充跳过 DEV 交付、代码变更后沿用旧证据、VERIFY 阶段夹带代码等用例，先复现失败再修复。

最终测试命令：

```bash
python3 docs/v4-migration/governance/scripts/test_v4_module_gate.py
```

结果：18 个测试方法通过，覆盖真实临时 Git/bare origin 的允许及拒绝路径；无 GitHub 或集群变更。用例中的批准记录仅为测试 fixture，真实阶段记录仍是“分析中”、`review: null`。

本地质量检查包括：变更 Markdown/JSON 的 Prettier、Python 源码编译检查、工作区及暂存区 `git diff --check`、生效治理文件与快照逐字节一致性、阶段记录的证据摘要及 V3 tree 核对。提交前执行根目录门禁 `workloads commit --records-only`；提交后执行 `start --phase REA` 和显式 DEV 拒绝检查。

本批不运行应用构建、不创建测试镜像、不 rollout、不做新的 Playwright 页面测试。部署镜像和 Pod imageID 不适用于本次流程工具修复，未回读；旧部署不能作为本次编辑设置功能验收证据。Deployment 编辑设置仍未完成 REA、DEV 和完整部署后 VERIFY。

## 实际限制与下一项

脚本只能检查结构、版本、路径和记录一致性，不能判断复核人是否真实签署、证据内容是否充分或测试是否真实执行，也无法阻止人绕过 CLI 直接操作。证据语义、实际测试/CI/镜像/Pod/浏览器和项目已有的独立复核要求仍需执行。

当前不需要负责人新增风险豁免或重复审批流程修复。下一项为编辑设置 DS-01/DS-19 的定向 REA：从当前制品确认真实入口、加载模块和 Action 请求，随后逐字段展开，按证据选择 V4 复用/改造；不再从简化表单倒推需求。

## 2026-10-23 执行入口补强

负责人再次授权修复反复偏离文档的问题。执行前 HEAD/远程 Workload 均为 `f5c375f6b9e2b9ae66a4331289c2dbee7bee8bb4`；集成基线为 `3e09afd6a051d4091b3c887462c880eff2ba6754`，PR #2 Open/Draft，目标 `feature/v4-migration`。本地 tracked 干净，已有 `.playwright-cli/` 和 `output/` 保留。首次从非 Git 的根目录运行 start 失败后，已切回登记 Worktree，`workloads start --phase REA` 成功；未绕过门禁编码业务。

根因：原 `pre-commit` 只执行 lint-staged，模块 CLI 依赖主动调用，缺少中文提交标题检查和 PR 阶段工作流。先更新主计划第 3.3 节，明确本次记录通道可改的三个执行入口，再修改工具；不新增开发阶段，不放行 REA。

实际修改：

- `pre-commit` 在 lint-staged 后调用同一门禁，检查最终暂存内容、登记分支/Worktree、阶段和范围。
- 新增 `commit-msg`；中文必须出现在提交标题正文，技术名称和 Conventional Commit 前缀可保留。已推送英文历史不改写。
- 新增 PR CI，工具回归与真实阶段检查分为两个 Job。检出实际 Head SHA、完整历史和只读权限；不访问测试环境、不使用部署凭据。
- CI 用版本化注册表，在 Runner 路径或 detached HEAD 下检查 PR 目标、Base 祖先、完整差异及阶段证据；不只检查最后一次文档提交，不为历史先行实现设置豁免基线。非 Draft 必须完成 DEV/VERIFY 并处于 PR 阶段。
- 当前 REA 的 PR #2 仍包含历史业务实现，真实阶段检查应拒绝；工具回归通过和 PR 业务门禁通过必须分开报告。保留分支、提交和 Draft，不强推、不自动合并。

测试先行：新增用例首次在旧入口上出现 8 项失败，实际复现 REA 代码/英文标题/未登记迁移分支仍可提交、缺少 CI 模式和未授权工具路径。修复后 32 项回归通过，覆盖真实 Git 提交的拒绝和允许、格式化后越界、错误 Worktree、集成分支直提、普通功能分支兼容、Runner 注册表、完整 PR 差异、非 Draft 跳级和合法 DEV/PR 路径。外部格式化与 Husky 启动依赖采用测试替身；门禁、钩子、Git 提交和本地 bare origin 实际执行。

本批只修复开发流程工具，没有业务界面或路由改动。未执行应用构建、镜像构建、131 部署和浏览器验收；无本批镜像、digest 或 Pod imageID。Deployment 编辑设置仍为 REA/分析中，已有高风险未知项与 `review: null` 保留。GitHub 实际 Run、检查结论和必需检查配置以推送后的远程回读为准，不用本地回归替代。

### 真实提交、CI 和分支保护

工具实现提交 `da38cb87ec683a6bf67b3f3a90764a6f2910b0af`：`fix(migration): 将模块门禁接入提交钩子和 PR 检查`。真实 Husky、lint-staged、模块检查和中文标题检查均执行成功，正常推送；未使用跳过钩子或强推。证据详见[实际验证 JSON](./governance/module-gate-verification-20261023.json)。该证据绑定工具代码 SHA；后续仅记录结果的提交不会冒充该 Run 已验证的新版本。

| 检查                                                                                                                    | 实际结果                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `python3 docs/v4-migration/governance/scripts/test_v4_module_gate.py`                                                   | 本地 32 项通过；远程 Python 3.12 同样 32 项通过                                                                                     |
| `go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.7 -shellcheck= -pyflakes= .github/workflows/v4-module-gate.yml` | 工作流检查通过                                                                                                                      |
| 变更 Markdown/JSON/YAML 的 Prettier、Python 编译、`sh -n`、工作区/暂存区及提交 `git diff --check`                       | 通过；不是业务完整测试                                                                                                              |
| `workloads commit --records-only` 与真实提交钩子                                                                        | 通过，仅提交治理改动                                                                                                                |
| `workloads pr --pr 2 --records-only`                                                                                    | 通过，远程 Head 与本地相同，PR 仍为 Open/Draft                                                                                      |
| [Run 39812232782](https://github.com/mysStack/console/actions/runs/39812232782)                                         | 实际 Head 为 `da38cb87e`；工具回归成功，阶段检查失败，总结论为 failure                                                              |
| 本地及远程 `auto ci ... --draft`                                                                                        | 拒绝 REA 中的历史业务差异，首个路径 `locales/en/l10n-projects-applicationWorkloads-deployments-list.js`；这是应有拦截，不是环境故障 |

已通过 GitHub API 为 `feature/v4-migration` 配置并再次 GET 核验两个必需检查：“门禁工具回归”和“模块阶段与 PR 范围”，均绑定 GitHub Actions App `15368`；要求分支最新，对管理员生效，禁止强推和删除。未新增评审人数要求、未修改稳定分支、未合并 PR。首次 PUT 因同时提交 `contexts` 和 `checks` 返回 HTTP 422；删除重复的 `contexts` 参数后成功，最终配置已回读，不把首次失败写成成功。

远程集成提交仍为 `3e09afd6a051d4091b3c887462c880eff2ba6754`，稳定分支仍为 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`。钩子代码目前位于 Workload 分支，未覆盖其他已有 Worktree；其他 PR/后续分支必须取得这些版本化入口并实际产生必需检查，缺少检查时不能合并，不能用手工通过或管理员绕过代替。

本次修复的是提交/PR 执行入口，不能阻止编辑器写文件、不能自动判断页面语义或代替指定复核。当前范围已调整为 Deployment、StatefulSet、DaemonSet 组合批次；下一项是先完成三类资源的组合 REA 与差异矩阵，再满足既定模块条件后进入 DEV；不重新启动全量 P0。

## 2026-10-23 组合批次范围调整

依据负责人“Deployment、DS、STS 放在一起开发”及确认调整文档的指令，当前能力改为 `deployment-statefulset-daemonset`。执行前本地和远程 HEAD 均为 `1412940b00c19ff2413758d4a233176afa73df5e`；PR #2 Open/Draft，目标和集成提交未变。沿用登记 Worktree 和分支，不改写历史。

主计划、执行规则、注册表、实施清单和模块状态同步调整。公共 Workload 能力共用实现，三类资源单独记录 REA、差异、测试和验收；Deployment 的 `DS-*` 清单表示 Deployment Settings，DaemonSet 使用 `DAEMON-*`，避免条目混淆。Pod、Job、CronJob 保留后续范围。新增[组合边界矩阵](./workload-kind-capability-matrix.md)只用于防遗漏，不将候选字段冒充当前 V3 功能。

当前阶段仍为 REA/分析中，三项高风险未知和 `review: null` 保留。原 Deployment 证据保持其提交和观察边界；更新文档摘要只绑定修订后的记录，不表示新增运行时证据。此次未修改业务代码，未构建镜像、部署或执行浏览器验收，无本批镜像和 Pod imageID。

本批记录检查：变更文档/JSON 的 `corepack yarn prettier --check` 通过；5 份根目录治理文件与版本化快照逐字节一致，4 份证据摘要、12 个未完成覆盖维度、3 类资源范围、源提交/V3 tree 及 66 个相对链接核对通过。另将实施清单中 3 个本分支缺失的历史验证链接改为原分支固定提交 `9fa3c15b4eef8c1d7986b4afe79f97704a160d5a` 的引用，不复制历史验收结论。恢复时因已有本批文档改动，普通 start 拒绝脏工作区；暂存前 commit 检查亦拒绝未暂存阶段记录，均未绕过。后续按记录通道检查最终暂存内容。上述检查不等于业务测试或阶段通过。
