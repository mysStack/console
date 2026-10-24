# ks-develop 项目协作约束

## 适用范围

本文件适用于 `console`、`kse-console-v3` 和 `kubesphere`。子项目中的
`AGENTS.md` 可以补充本文件，但不能放宽安全和验证要求。

## 通用工作方式

- 修改前先检查目标仓库的 `git status`、当前分支、现有测试和相关验收记录。
- Git 新提交标题和说明统一使用中文，技术名称和 Conventional Commit 前缀可以保留；不改写已经推送的英文历史。
- 优先复用已有测试；新增测试前先确认没有可复用的回归用例或测试资产。
- 新功能或缺陷修复优先补充单元/组件测试，再实现代码。
- UI 或路由改动需要浏览器验收；使用 `playwright`，不要只凭构建成功判断页面可用。
- 跨服务、镜像、静态资源或集群改动必须记录可复现的验证证据。
- 涉及镜像、静态资源或集群的测试，必须完成“构建制品 → 部署到指定测试环境 → rollout 成功 → 在已部署制品上用 Playwright 验收”这一整条链路后，才算测试结束；只完成本地测试、Action 构建或代码检查不得报告测试通过。
- 浏览器登录测试统一从 `/home/bruce/.bashrc` 加载专用测试账号环境变量；不得在命令输出、日志、截图、测试配置或提交中打印或写入用户名密码。
- 测试失败时区分代码、测试数据、依赖、浏览器、容器和 Kubernetes 环境问题。
- 不读取或提交真实凭据，不在测试配置中新增明文密码；使用专用测试账号或环境变量。
- 不覆盖、删除或提交既有的 `dist`、截图、`.playwright-cli` 等生成物，除非任务明确要求。
- 不启动生产服务、不运行生产迁移、不对共享集群执行破坏性操作。
- 开发或修复过程中，每完成一个重要阶段（定位、编码、测试、构建、部署、浏览器验收）主动汇报进度；连续工作超过 5 分钟时至少汇报一次，不得长时间无反馈。
- 修改代码前先确认现有行为和回归用例；保持改动最小，只修复已验证的问题，不改动无关或已经正常的功能。涉及共享组件时必须补跑受影响回归，并在验收中说明保留的行为。

## V4 迁移模块硬门禁

KubeSphere Console V4 迁移必须以 `/home/bruce/code/ks-develop/console-v4-migration-plan.md`
为唯一项目计划基准，并遵守 `/home/bruce/code/ks-develop/v4-module-execution-rules.md`
和 `v4-module-branch-registry.json`。这些规则适用于 Workload 及之后的所有模块。

- 每个模块开始 REA、DEV、VERIFY 前，先创建或进入登记的独立短期分支和 Worktree；禁止借用其他模块分支继续开发。
- 修改前必须执行 `/home/bruce/code/ks-develop/scripts/v4-module-gate.py <module> start`。门禁失败时不得修改代码。
- 提交前执行同一脚本的 `commit` 阶段；部署前执行 `deploy --tag <镜像标签>`；创建或更新 PR 前执行 `pr --pr <编号>`。
- 所有模块分支基于执行时核验的远程 `feature/v4-migration` 创建，PR 目标固定为 `feature/v4-migration`。不得直接提交稳定分支或迁移集成分支。
- 跨模块共享改动必须先记录依赖和影响范围。通用底座改动归 `feature/v4-resource-framework`；模块分支不得静默夹带其他模块功能。
- 模块状态严格按 `REA → DEV → VERIFY → PR` 推进。历史代码、其他分支测试、旧镜像和旧浏览器证据只能作为输入，不能直接继承为当前分支通过。
- 当前阶段以模块分支内 `docs/v4-migration/module-execution.json` 为准；`start/commit/deploy/pr` 是检查时机，不代表业务阶段已通过。REA 记录和能力清单未闭环不得编码或部署。仅修复文档/证据/门禁工具时使用 `--records-only`，不能夹带业务代码，不能授权部署或放行正式 PR。门禁脚本不能代替证据内容复核和部署后浏览器验收。
- 提交钩子在 lint-staged 后自动执行登记模块的阶段检查，并检查中文提交标题；PR CI 检查实际 Head 的完整差异。不得用工具回归通过代替模块阶段通过，不得把本地钩子或 CI 工作流存在等同于 GitHub 必需检查已启用。
- 文档冲突时，先停止编码并修正文档。优先级为：用户最新明确指令 → 主迁移计划 → 模块执行规则/分支注册表 → 模块实施计划 → 状态与历史证据。永久调整执行策略时，必须先更新主迁移计划。

## Skill 路由

- 测试方案：`test-design`
- 执行测试并收集证据：`test-execute`
- 分析失败和回归结果：`test-analyze`
- 真实浏览器流程：`playwright`
- 新功能或缺陷修复：`superpowers:test-driven-development`
- 复杂失败定位：`superpowers:systematic-debugging`
- 声明完成前的最终核验：`superpowers:verification-before-completion`
- Kubernetes 问题：`kubernetes-debugging`
- Docker/镜像问题：`docker-debugging`
- GitHub Actions 失败：`gh-fix-ci`
- 发布前检查：`release-check`

## 完成标准

最终说明必须列出实际执行的命令、通过/失败结果、部署镜像和实际 Pod 镜像身份、未执行的环境验证，以及仍存在的风险；部署或浏览器验收未完成时，必须明确标记为未完成，不得宣称“测试通过”或“全部通过”。
