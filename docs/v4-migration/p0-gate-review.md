# P0-REA 门禁复核包

> 复核材料生成日期：2026-10-17（上海时间）  
> 复核对象：`feature/v4-configmaps-secrets` 当前文档提交 `2eacd83f9`  
> 迁移基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`  
> 门禁状态：**待项目负责人或指定复核人确认，不能进入下一阶段**

本文件把 P0-REA 的完成条件逐项列出，方便项目负责人在同一组证据上复核。它不把历史实现、历史部署或协调 Agent 的自检结果写成门禁通过。

## 1. 条件核对

| 条件 | 当前结论 | 证据和限制 |
| --- | --- | --- |
| Git 基线、分支和 Worktree 已固定 | 已完成 | `agents-status.md`；三个 P0 Worktree 和任务分支均存在且干净；主工作区保留原有未跟踪文件，未覆盖或删除 |
| V3/Wujie、`ConsoleV3ResourceList`、扩展和构建引用静态盘点 | 已完成首轮 | `p0-audit-evidence.md`、`p0-route-inventory.md`、`dependency-inventory.md`；文件计数是候选引用，不等于全部启用路由 |
| V3 路由、V4 路由树和动态 Action 对照 | 已完成首轮 | `p0-route-inventory.md`、`p0-action-inventory.md`；仍需全量启用入口、权限和 Action 逐项映射 |
| 旧 V3 源码候选和模块行为 | 已完成候选取证 | `p0-v3-module-source-evidence.md`；已定位 release-3.2/3.3/3.4，但未证明 `origin/release-3.4` 就是当前 `v3dist` 的构建来源 |
| `v3dist` focused REA | 已完成首轮 | `p0-rea-evidence.md`；Evidence ID、制品 SHA 和覆盖限制已记录；语义/application coverage 仍是 partial |
| 当前测试制品身份可回读 | 已完成当前 Pod 回读 | `p0-runtime-evidence.md`；Pod imageID 为 `sha256:04650b...`，rollout read-only 检查成功；外部镜像与旧源码 provenance 仍缺 |
| 131 菜单、直达、刷新、返回、Tab、Network 和错误态 | 代表性完成 | `p0-runtime-evidence.md`；覆盖项目入口、原生 Secret 详情和日志收集 Wujie frame；未覆盖全部作用域、所有启用路由和低权限账号 |
| 当前启用扩展清单 | 部分完成 | 只读 CRD 列出 15 个 `Installed`、1 个 `InstallFailed`；工作台显示 16 个，统计口径不一致；扩展初始化错误已记录 |
| 独立 Agent 复核 | 未完成 | 三次启动请求均返回协作服务 `429 Too Many Requests`；首轮证据由协调 Agent 在对应 Worktree 完成 |
| 门禁签署 | 未完成 | 复核人、日期和结论待项目负责人或指定复核人填写 |

## 2. 高风险未知项

| ID | 当前状态 | 进入下一阶段前的关闭动作 |
| --- | --- | --- |
| P0-U001 | 分析中 | 固定旧 V3 源码 commit/tag 与构建配置；如果只能拿到编译制品，须由负责人确认“仅制品分析”边界 |
| P0-U002 | 分析中 | 将静态路由、扩展和动态 Action 清单与 131 菜单、权限、Network 和 focused REA 逐项关联；解释扩展计数差异 |
| P0-U003 | 分析中 | 补齐 cluster、workspace、federated、platform、extension 入口，以及低权限账号和错误态对照 |
| P0-U004 | 分析中 | 补齐当前镜像 tag/digest、Pod imageID、`v3dist` tree 与旧源码来源的可核验链路 |

## 3. 结论

当前结论为 **P0-REA 待复核/未通过**。证据包已经可以交给复核人，但高风险未知项和独立复核没有完成，不能创建或启动 P1/P2 正式开发任务，不能把 ConfigMap、Secret、ServiceAccount 的历史实现当作本轮 P2-REA 完成。

复核人确认栏：

| 项目 | 待填写 |
| --- | --- |
| 复核人 |  |
| 复核日期 |  |
| 门禁结论 | `待复核` / `已通过` / `不通过` |
| 备注和附加证据 |  |

