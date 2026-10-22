# Workload 分支偏差与纠正记录（2026-10-22）

## 依据与已确认偏差

项目主计划 `/home/bruce/code/ks-develop/console-v4-migration-plan.md` 第 3 节要求按模块使用独立短期分支及 PR；Workload 对应 `feature/v4-workloads`，目标为 `feature/v4-migration`。单 Codex 会话、顺序执行及模块级门禁没有取消这一分支规则。

此前 Workload 代码继续提交到 `feature/v4-configmaps-secrets`，最新历史提交为 `9fa3c15b4eef8c1d7986b4afe79f97704a160d5a`。2026-10-21 的执行清单将该分支作为后续 Workload 开发分支，也偏离了主计划。本记录纠正执行归属，不将后续清单作为变更主计划分支规则的授权。

## 本次实际建立的隔离

| 项目          | 实际状态                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| Workload 分支 | `feature/v4-workloads`                                                           |
| Worktree      | `/home/bruce/code/ks-develop/console-workloads`                                  |
| 创建基线      | `3e09afd6a051d4091b3c887462c880eff2ba6754`，已与远程 `feature/v4-migration` 核对 |
| 原工作区      | `/home/bruce/code/ks-develop/console`，继续保留原分支、提交及未跟踪文件          |
| 原 Draft PR   | #1 保持 Draft，不合并、不强推、不改写历史                                        |
| P0 Worktree   | Audit、REA、Baseline 三个工作区全部保留                                          |

本分支从迁移集成基线创建，没有从混合分支整体派生。历史 Workload 代码已按功能提交逐项迁入，没有合并 ConfigMap/Secret/P0 混合开发线。原分支中的已有实现、测试和 131 证据继续保留其原始 Git/镜像版本边界。

## 实际归集结果

| 能力                                                | 独立分支提交                          |
| --------------------------------------------------- | ------------------------------------- |
| HPA API 路径                                        | `2168cbdb2`                           |
| 原生详情路由及旧外壳清理                            | `ee6250d7b`、`35a318294`              |
| Deployment、StatefulSet、DaemonSet 原生项目列表     | `c621493a1`                           |
| 操作失败传播、项目作用域、刷新和状态原因            | `832f226c9`、`ba6566ec4`、`91397549e` |
| Deployment 原生基础创建和错误反馈                   | `12336b970`、`76bdbb4bf`、`71755c650` |
| 多容器、初始化容器、端口、环境变量和共享 ArrayInput | `155d41aee`                           |
| 容器字段布局及跨容器校验刷新                        | `788b1a6df`、`690e0bfab`              |
| 启动命令和参数                                      | `58ec1bb01`                           |
| 现代 Node 包构建兼容及测试门禁清理                  | `6376e818b`、`aad2e9248`              |

归集后代码与原混合分支 `9fa3c15b4` 的目标 Workload 文件一致，并额外移除了 `WorkloadBanner` 的无效导入，增加副本输入、容器布局、跨容器校验和多语言启动命令测试。没有迁入 ConfigMap、Secret、ServiceAccount、应用模板、扩展或 P0 文档改动。

## 后续归集范围与约束

1. 先核对原生项目列表、详情路由、Workload Store、创建表单及必要共享依赖的提交和文件清单，再迁入当前分支；不能整条合并 ConfigMap/Secret/P0 混合开发线。
2. 直接相关的历史提交已逐项核验并归集；`d091cb1cd` 只迁入 Workload 旧详情外壳清理，没有迁入其 ConfigReference、脚本和 P0 文档改动。
3. 不迁入无关 ConfigMap/Secret/ServiceAccount、应用模板、扩展改动或全局 P0 文档；确有共享依赖时逐项说明用途并补受影响回归。
4. 在独立分支重新运行本地测试和构建；只有该分支制品完成 131 rollout、镜像身份回读及浏览器验收后，才能登记新的 VERIFY 通过结果。此前 25 项浏览器结果不能直接继承为新分支通过。
5. Workload 后续代码只提交到本分支，完成对应验证后准备独立 PR 指向 `feature/v4-migration`。原 PR #1 中的混合范围仍需另行整理，本次不自动合并、关闭或改变其目标分支。

## 当前验证结论

本次核验 Git 基线、分支、Worktree 和原 PR 状态，并在工作区根目录建立适用于所有后续模块的主计划门禁、模块注册表、执行规则和检查脚本。`workloads start`、`deploy` 和 PR 门禁均以登记分支及精确 SHA 为准。

纠正后已创建 Draft PR #2，并在 `288fbccab63bebf76c3677beadc8b00c60c3cfd3` 完成本地回归、GitHub Actions 镜像构建、131 rollout、Pod imageID 回读和全新浏览器 Playwright 验收。该结果证明分支和首轮 VERIFY 链路已闭环，详见 [Workload 131 VERIFY 记录](./workload-131-verify-20261022.md)。Workload 整体功能仍未完成，继续保持“开发中”。
