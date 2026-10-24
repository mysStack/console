# KubeSphere Console V4 模块执行规则

本文件把主迁移计划的分支和验收要求变成每个模块开工前都要执行的硬门禁。它不替代主计划；发生冲突时以主计划为准并先修正文档。

## 固定执行顺序

每个模块均执行以下状态机：

```text
REGISTERED → REA → DEV → VERIFY → PR → REVIEWED → INTEGRATED
```

- `REGISTERED`：`v4-module-branch-registry.json` 已登记能力边界、分支和 Worktree。
- `REA`：旧源码、当前制品 REA、实际运行时、路由、API、Store、Action、RBAC、作用域、缓存和错误路径有模块矩阵。
- `DEV`：仅在模块分支实现；先写或复用失败测试，再修改代码。
- `VERIFY`：本地测试和构建通过后，构建当前 SHA 镜像，部署 131，核对 rollout/digest/imageID，再以新浏览器登录执行 Playwright。
- `PR`：独立 Draft PR 指向 `feature/v4-migration`，材料完整后等待人工复核。
- `REVIEWED/INTEGRATED`：只能由负责人复核和合并动作改变，执行会话不得自动宣布。

## 当前状态与历史证据

业务阶段与门禁结论分开记录：`phase` 使用 `REA/DEV/VERIFY/PR`，REA 结论使用主计划规定的 `未开始/分析中/待复核/已通过/不通过/阻塞`。已有代码或某批浏览器场景通过不改变 REA 结论。

每个模块分支的 `docs/v4-migration/module-execution.json` 是唯一当前阶段记录；`agents-status.md`、`matrix.md` 和 `rea-analysis-summary.md` 引用它。旧 SHA、旧镜像和旧进度归历史快照，不能出现多个互相矛盾的“当前状态”。当前能力改变时重新评估证据，不沿用上个能力的放行。

REA 按具体能力编制行为清单，至少覆盖入口、字段、默认值、校验、API、Store、Action、RBAC、作用域、缓存、错误/取消、运行时和 V4 对应实现。具体表单必须先列完整分区和字段，再决定复用或重构；不能用简化实现的测试反推 V3 功能清单完整。组合批次还必须增加“资源类型”维度，明确公共行为与 Deployment、StatefulSet、DaemonSet 等资源差异。

REA 的 `partial/no-match` 不代表整体失败或功能不存在。通过当前 Bundle 的定位、合法旧源码参考及真实 V3 浏览器/Network/API 相互校验，证明当前范围即可；不追求恢复整个原始源码或无截断的大型语义图。未知行为保持未知，高风险差异关闭或经复核明确隔离后才能进入 DEV。

同一资源模型下的多个 Kubernetes 资源可以登记为一个组合能力批次，以复用列表、详情、表单、Store、缓存和权限底座。组合批次的 REA 必须为每类资源分别记录入口、字段差异、默认值、校验、Action/API、RBAC、作用域、错误和运行时场景；共享实现不等于共享验收。一类资源的 DEV/VERIFY/PR 结果不能自动晋级另一类资源，组合批次只有在所有登记资源的必要条件都满足后才能标记整体通过。

## 每次工作的固定前置输出

修改代码前必须回读并报告：

| 项目           | 要求                                                      |
| -------------- | --------------------------------------------------------- |
| 模块 ID 与范围 | 必须与注册表一致                                          |
| Worktree       | 必须是模块登记目录                                        |
| 当前分支       | 必须是模块登记分支                                        |
| 集成基线       | 实时读取远程 `feature/v4-migration`，确认它是当前分支祖先 |
| 工作区         | 开工时 tracked 文件必须干净；已有未跟踪产物只记录、不覆盖 |
| 阶段           | 明确 REA、DEV、VERIFY 或 PR，不能跳级                     |
| 交付物         | 本轮代码、测试、文档、镜像和浏览器场景清单                |

标准命令：

```bash
/home/bruce/code/ks-develop/scripts/v4-module-gate.py <module-id> start
```

脚本默认读取记录中的业务阶段；可用 `--phase REA` 显式核对。`start/commit/deploy/pr` 仅表示检查时机。缺少阶段记录时，先用 `start --phase REA --records-only` 初始化记录和证据，不得写业务实现。

阶段记录至少包含：`module`、`branch`、`capability`、`phase`，以及 `rea.status/sourceCommit/artifactTree/documents/coverage/highRiskUnknowns/review`。`documents` 使用仓库内文件路径和 SHA-256；`coverage` 覆盖 `entry/fields/validation/api/store/action/rbac/scope/cache/errors/runtime/v4`，每项包含状态和引用的证据文件。开发前所有维度为“已核对”，并不表示最终测试已通过；具体观察与局限仍必须在证据正文列明。`review` 仅记录实际指定复核人、日期和可追溯的文档依据，不得补造签署。

进入 VERIFY 的前置交付记录为 `dev`，进入 PR 的前置记录为 `dev` 和 `verify`：每项包含 `status: 已完成`、完整 `sourceCommit` 及带 SHA-256 的 `documents`。源提交必须是当前分支祖先，其后只允许记录类改动；业务代码变化后必须回到 DEV，更新本地检查并重新完成相应 VERIFY。DEV 文档记录实际测试/构建/诊断，VERIFY 文档记录制品、部署、浏览器、RBAC、作用域、缓存和 V3 对照；未完成项不得填“已完成”。VERIFY/PR 阶段不得夹带新的业务代码提交。

`--records-only` 用于证据整理、状态纠偏或门禁工具修复，允许 `docs/v4-migration/`、当前迁移实施计划，以及主计划 2026-10-23 授权的三个执行入口 `.husky/pre-commit`、`.husky/commit-msg`、`.github/workflows/v4-module-gate.yml`；其他工作流和业务路径不在此范围。治理脚本及其测试以 `docs/v4-migration/governance/` 的版本化文件保存。该通道禁止业务改动、部署及更新非 Draft PR。它不能把阶段标记为通过。

## 分支和提交规则

1. 模块分支从开工时的远程集成分支创建，不能从另一个模块分支整体派生。
2. 一个提交只服务当前模块；无关代码、其他模块文档和生成物不得暂存。
3. 共享改动优先进入 `resource-framework`。模块内保留共享改动时，必须附调用方、原因、受影响回归和最终归属。
4. 提交前运行 `v4-module-gate.py <module-id> commit`、相关测试、格式/静态检查和 `git diff --check`。
5. 不强推、不改写历史、不直接提交 `release-4.1.5` 或 `feature/v4-migration`。
6. 新提交标题和说明统一使用中文，保留必要技术名称和 Conventional Commit 前缀；`commit-msg` 自动检查标题正文部分包含中文，不能只在 scope 中写中文。已推送的英文历史保留，不擅自 amend 或强推。

Git `pre-commit` 在现有 lint-staged 格式化之后调用版本化门禁，检查最终暂存内容；模块由登记分支自动识别，未登记的迁移分支、错误 Worktree 和不符合阶段的代码提交拒绝。普通非迁移功能分支保持原有流程，稳定/迁移集成分支禁止直接提交。独立工作副本需先正常安装 Husky；本地钩子不是不可绕过的安全边界。

PR CI 检出实际 Head SHA，使用版本化注册表和本地 Git 对象校验目标、祖先关系、完整 PR 差异和阶段。Draft 的记录类 PR 可以持续补证；REA 阶段只要完整 PR 差异含业务代码就应失败，不能只检查最后一次提交。非 Draft 必须具有 PR 阶段及 DEV/VERIFY 证据。工具回归与实际阶段检查分开显示；工具测试通过不代表当前模块通过。CI 的工作目录由 Runner 决定，不套用本地绝对 Worktree 路径。

REA 阶段提交仅允许上述记录路径。DEV/VERIFY/PR 必须有相符的 REA 通过记录、完整覆盖、当前 V3 tree、未变更的证据摘要、无未闭环高风险项及真实复核依据。提交检查工作区和暂存区的 `diff --check`，阶段记录与已绑定证据的暂存内容必须与检查内容一致。

## 部署和验收规则

部署前执行：

```bash
/home/bruce/code/ks-develop/scripts/v4-module-gate.py <module-id> deploy --tag <分支-上海时间-短SHA>
```

必须同时满足：当前分支已推送且本地/远程 SHA 一致；镜像标签包含登记分支、上海时间和当前 12 位短 SHA；GitHub Actions 检出并构建相同 SHA。之后完成 131 rollout、Pod Ready、digest/imageID 回读和新浏览器 Playwright。旧分支或旧镜像结果不能替代当前验证。

部署检查要求 `phase=VERIFY`，并已具备当前代码的 DEV 交付和本地检查记录。脚本只做记录和 Git 身份的机械核对，不连接集群、不自动部署；CI Run、镜像 digest、Pod imageID、浏览器和功能等价必须在实际操作中逐项回读，不能用脚本成功替代。

## PR 规则

```bash
/home/bruce/code/ks-develop/scripts/v4-module-gate.py <module-id> pr --pr <PR编号>
```

脚本必须确认 PR Head 等于模块分支、Base 等于 `feature/v4-migration`、Head SHA 等于当前已推送提交。PR 初始保持 Draft；人工复核之前不合并。模块之间存在依赖时，在 PR 中明确依赖的集成提交，不隐式依赖其他未合并分支。

正式材料检查要求 `phase=PR` 且 DEV/VERIFY 记录齐全；尚在 REA 的取证和工具修复可以用 `pr --pr <编号> --records-only` 更新现有 Draft 材料，不表示该 PR 或模块通过验收。

## 工具能力边界

脚本输出分别报告“Git/Worktree 身份检查”和“阶段记录检查”，不再使用笼统的“模块门禁通过”。脚本可以识别缺失记录、阶段冲突、未关闭风险、证据摘要变化、制品版本变化和越界提交，不能证明证据语义或签署真实，也不能代替项目既定的独立复核。所有检查都是协作流程检查，不能替代 GitHub 分支保护或阻止绕过脚本的直接操作。

## 偏差处理

发现分支、阶段、文档或制品身份不匹配时立即停止新增功能：保留历史，记录偏差，建立正确分支/Worktree，逐项迁移明确属于该模块的提交，然后在正确分支重新测试。禁止用整条 merge、强推或删除历史来“整理干净”。
