# Workload 编辑设置分区显示 DEV 记录（2026-10-25）

## 1. 对照结论

本轮以 `release-4.1.5` 完整前端源码和同版本已部署页面 `http://192.168.2.131:30881` 为主基线，当前 V4 页面使用 `http://192.168.2.131:30880`。旧 V3 源码只作为历史补充，本轮没有把旧 V3 页面直接复制到 V4。

在相同 Deployment fixture `v4-deploy-edit-ef3` 上，`release-4.1.5` 的“编辑设置”使用左侧分区列表：初始显示“更新策略”，点击“容器”后只显示容器内容。此前 V4 原生 `WorkloadSettingsModal` 虽然已经有左侧导航和 `1162px` 宽度，但所有分区同时渲染，通过滚动定位切换。这是已确认的行为和布局差异。

## 2. TDD 过程

先在 `WorkloadSettingsModal.test.ts` 增加“非当前分区必须隐藏”的断言，运行：

```text
./node_modules/.bin/esno packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.test.ts
```

RED 结果：4 个测试中 3 个通过、1 个失败；失败断言为初始“更新策略”分区缺少 `hidden=false`，证明旧实现没有分区可见性约束。

随后补充最小原生实现：

- 左侧导航使用 `tablist` / `tab` 语义和 `aria-selected`；
- 每个分区使用 `tabpanel`、稳定 `id` 和 `aria-controls`；
- 当前分区保持显示，其他分区使用 `hidden` 隐藏；
- 保留现有 Form、字段、Store、API、保存、取消和错误处理逻辑。

GREEN 结果：定向测试 4/4 通过；全量 `./scripts/test.sh` 为 91 个测试文件、404 个断言全部通过；`corepack yarn build:packages` 成功。构建只报告仓库原有的循环依赖和 Node 模块类型警告。

## 3. 提交与阶段

- 代码提交：`5f5a7df73`（`修复(Workload): 对齐编辑设置分区显示`）
- 当前阶段：`DEV / 进行中`
- 本次代码只修改 `WorkloadSettingsModal` 及其回归测试，没有修改稳定分支、集成分支、V3 制品或 Kubernetes 资源。

## 4. 尚未完成

- 当前提交尚未重新执行 CI 镜像构建、131 部署和部署后 Playwright 验收；此前宽度修复制品的结果不能替代本次提交。
- 必须在新制品中逐项点击 Deployment、StatefulSet、DaemonSet 的所有分区，确认页面只显示当前分区，并确认保存、取消和错误提示不回退。
- 低权限正反、缓存失效、完整错误矩阵和三类资源逐项 V3 等价仍未闭环。
- 扩展初始化错误按项目决定暂不纳入本模块修复，但验收记录不能写成控制台零错误。
