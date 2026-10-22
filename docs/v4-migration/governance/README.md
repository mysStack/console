# 项目治理文件版本化快照

此目录保存本次已应用的根目录治理文件，便于代码评审和恢复。唯一项目计划仍为 `/home/bruce/code/ks-develop/console-v4-migration-plan.md`；本目录不是另一套生效计划。根目录 `ks-develop` 没有 Git 仓库，因此用当前 Workload 分支归档这些文件，不初始化新仓库。

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
```

未来模块尚无阶段记录时，使用 `start --phase REA --records-only` 初始化文档；缺记录时普通 start、DEV、VERIFY 和部署应拒绝，不能继承其他模块结论。

测试只在临时目录创建本地 Git 仓库和 bare origin，不访问 GitHub、集群或真实业务数据。测试中的复核人/签署属于隔离 fixture，不写入真实项目记录。脚本只检查数据结构与证据绑定；实际签署、测试真实性、CI、digest、Pod imageID 和浏览器结果仍须独立回读。

本次不需要镜像部署或浏览器验收：变更限于流程文件、门禁 CLI 和其测试；Deployment 编辑设置的业务功能依然未完成，旧镜像不作为本次通过证据。
