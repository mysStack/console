# Workload 编辑设置面板 DEV 增量（2026-10-27）

## 范围与基线

- 分支：`feature/v4-workloads`；代码提交：`fcb919c94145b1c60bc43f48a1551cd4233d9731`。
- 主基线：131 测试环境 `30881` 上部署的 `release-4.1.5`；同一 Deployment `v4-migration-e2e/v4-deploy-edit-ef3` 与 V4 `30880` 对照。
- 浏览器观察：基线编辑设置有浅色导航区、深色选中项、白色设置面板，以及含策略说明和独立滚动更新设置块的首屏。此前 V4 弹窗是无面板边框的紧凑表单，策略说明缺失。两边均有五个分区；名称、项目、副本数量均不在该编辑设置入口展示。

## 本次改动

- 在 V4 原生 `WorkloadSettingsModal` 中补齐导航和表单面板层级、选中态样式。
- 在公共 `WorkloadUpdateStrategyInput` 中展示策略说明，区分滚动更新、同时更新和删除时更新，并为滚动更新字段提供独立设置块。
- 保留原有提交逻辑、三类资源字段分支和 API；没有引入 V3/Wujie。

## 测试与限制

- TDD：新增面板断言先失败（缺少导航面板）；实现后 `WorkloadSettingsModal.test.ts` 8/8、`WorkloadUpdateStrategyInput.test.ts` 3/3 通过。
- 受影响的 `WorkloadCreateModal` 19 个测试文件和三类详情 3 个测试文件逐个执行，均通过；Prettier 与 `git diff --check` 通过。
- CI Run [40300396915](https://github.com/mysStack/console/actions/runs/40300396915) 对该代码 SHA 的 Unit tests 与 Build and publish ks-console 均成功。
- 这只关闭已确认的首屏面板差异。当前代码尚未部署到 131，未在部署制品上完成 Playwright 视觉复验；容器、存储、调度等分区及完整字段等价仍需逐项验证。
