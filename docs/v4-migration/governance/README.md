# 项目治理文件版本化快照

此目录保存本次已应用的根目录治理文件，便于代码评审和恢复。唯一项目计划仍为 `/home/bruce/code/ks-develop/console-v4-migration-plan.md`；本目录不是另一套生效计划。根目录 `ks-develop` 没有 Git 仓库，因此用当前 Workload 分支归档这些文件，不初始化新仓库。

2026-10-23 起，版本化 `scripts/v4-module-gate.py` 同时作为 Git 钩子和 PR CI 的执行入口，与根目录脚本保持相同内容。本地使用根目录注册表和登记 Worktree；CI 使用本目录的版本化注册表，检出 PR 实际 Head，按完整 PR 差异检查，不依赖开发机绝对路径。

本次属于负责人授权的流程修复，影响所有后续模块的阶段检查；不修改共享业务组件。治理文件归档在 Workload 分支只用于保留本次纠偏历史，不授权其他模块借用 Workload 分支开发。

| 快照                             | 生效路径                                                  |
| -------------------------------- | --------------------------------------------------------- |
| `console-v4-migration-plan.md`   | `ks-develop/console-v4-migration-plan.md`                 |
| `v4-module-execution-rules.md`   | `ks-develop/v4-module-execution-rules.md`                 |
| `v4-module-branch-registry.json` | `ks-develop/v4-module-branch-registry.json`（内容未调整） |
| `AGENTS.md`                      | `ks-develop/AGENTS.md`                                    |
| `scripts/v4-module-gate.py`      | `ks-develop/scripts/v4-module-gate.py`                    |
| `scripts/test_v4_module_gate.py` | 同上级脚本的隔离 Git 回归；可直接在本目录运行             |

执行方式：

```bash
python3 docs/v4-migration/governance/scripts/test_v4_module_gate.py
/home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads start --phase REA
/home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads commit --records-only
/home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads pr --pr 2 --records-only
python3 docs/v4-migration/governance/scripts/v4-module-gate.py auto commit --hook
```

正常 Git 提交先执行现有 lint-staged，再运行模块检查；`commit-msg` 检查新标题包含中文，Conventional Commit scope 中的中文不能代替标题正文。普通非迁移功能分支保持原流程。提交钩子不能证明页面功能完整，也能被本地显式绕过；PR CI 的两个检查只有被设为集成分支的必需项后才会阻止合并。

CI 示例（只检查当前已提交的实际 Head）：

```bash
python3 docs/v4-migration/governance/scripts/v4-module-gate.py auto ci \
  --head-branch feature/v4-workloads --base-branch feature/v4-migration \
  --base <实际PR目标完整SHA> --draft
```

Draft 记录可持续提交；REA 中完整 PR 差异含业务代码必须失败。当前 PR #2 保留了历史先行实现，不能为了 CI 变绿改用最后一次提交作为比较基线，不能继承旧镜像验收。

[2026-10-23 实际验证](./module-gate-verification-20261023.json)保存工具提交 `da38cb87e`、远程 Run、32 项回归和真实阶段拒绝结果。集成分支的两个必需检查已配置，对管理员同样生效；它们未放行当前 PR #2。其他既有 Worktree 没有被覆盖，后续分支/PR 取得这些入口并产生检查后才能合并。

未来模块尚无阶段记录时，使用 `start --phase REA --records-only` 初始化文档；缺记录时普通 start、DEV、VERIFY 和部署应拒绝，不能继承其他模块结论。

测试只在临时目录创建本地 Git 仓库和 bare origin，不访问 GitHub、集群或真实业务数据。测试中的复核人/签署属于隔离 fixture，不写入真实项目记录。脚本只检查数据结构与证据绑定；实际签署、测试真实性、CI、digest、Pod imageID 和浏览器结果仍须独立回读。

钩子回归真实执行 Git 提交、本项目的钩子文件和门禁脚本；外部 lint-staged 用可控 shell 替身，Husky 启动器用 `set -e` 替身，避免为纯 Python CI 安装前端依赖。另覆盖格式化之后新增越界内容的拒绝路径。实际项目提交仍执行真实 Husky 和 lint-staged。

本次不需要镜像部署或浏览器验收：变更限于流程文件、门禁 CLI 和其测试；Deployment 编辑设置的业务功能依然未完成，旧镜像不作为本次通过证据。
