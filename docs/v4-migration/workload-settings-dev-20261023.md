# Workload 原生编辑设置 DEV 进度与本地验证

## 范围与版本

- 模块：`workloads / deployment-statefulset-daemonset`。
- 分支 / Worktree：`feature/v4-workloads` / `console-workloads`。
- 负责人批准进入 DEV：`5c24342571419708b6f0c21f3ce9e8f193da0e17`，批准原文见 [REA 复核记录](./workload-rea-review-20261023.md)。
- 本轮功能提交：`0c1d9aadf219fcabf5e6a310722591c9d7bef136`。
- 阶段仍为 DEV / 进行中；不是三类资源完整验收，也没有进入 VERIFY。

## 本次实现与保留行为

1. StatefulSet、DaemonSet 详情的“编辑设置”读取当前 namespace 下原始 API 对象，打开 V4 设置表单；“编辑 YAML”继续使用原有入口。权限键仍为各自资源的 `edit`，未增加权限，也未通过隐藏现有操作缩减功能。
2. 复用 `WorkloadSettingsModal` 和现有容器、初始化容器、卷、配置来源组件；三类资源分别解析和写入更新策略。Deployment 支持 `RollingUpdate/Recreate`、数量或百分比；StatefulSet 支持 `RollingUpdate/OnDelete` 和 partition；DaemonSet 支持 `RollingUpdate/OnDelete`、maxUnavailable、minReadySeconds，不生成 Deployment 的 replicas 字段。
3. 表单支持终止宽限时间，保留显式 `0`。策略切换到 Recreate/OnDelete 时移除不适用的 rollingUpdate；未编辑的策略、调度、安全上下文、Service、PVC 模板及原始 resourceVersion 保留。
4. StatefulSet 容器挂载校验同时识别 `volumeClaimTemplates` 的隐式卷名，不把这些模板伪造进 `template.spec.volumes`；未定义的卷名仍拒绝。
5. 保存使用原始 resourceVersion，`noGetDetail: true`；成功后刷新详情，读取失败显示错误，保存失败和 409 继续由原生 Modal 展示，不自动覆盖并发版本。

本次共享范围只在 Workload 编辑组件内：Deployment、StatefulSet、DaemonSet 共用转换和校验；创建表单仍使用原有 `DeploymentCreateValues` 和默认行为。未修改跨模块的通用 Store、缓存或 RBAC 底座。后续若需改这些底座，须先登记影响和回归范围。

## 实际执行与结果

| 命令/检查                                                                                                                         | 实际结果                                                                               | 边界                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `esno .../WorkloadCreateModal/deployment.test.ts`                                                                                 | 先复现 5 个新失败；策略校验与 PVC 模板分别复现额外失败；当前 24/24 通过                | 真正执行解析、校验和资源写回；保留未编辑字段和零值，不证明服务端持久化                         |
| `esno .../WorkloadUpdateStrategyInput.test.ts`                                                                                    | 新组件缺失时 3 个失败；当前 3/3 通过                                                   | 实际组件的分支和回调；浏览器依赖的 Kubed 控件替换为轻量边界，不证明页面渲染                    |
| `WORKLOAD_SETTINGS_TEST_REVISION=5c2434257 esno .../Workloads/settingsAction.test.ts`                                             | 原提交 Deployment 2 项通过，STS/DS 4 项失败                                            | 从 Git 读取原代码到内存复现，不改写或覆盖工作树                                                |
| `esno .../Workloads/settingsAction.test.ts`                                                                                       | 当前 6/6 通过                                                                          | 执行真实详情组件 Action；检查 namespaced GET、读取失败、打开设置及不误开 YAML；不证明真实 RBAC |
| `./scripts/test.sh`                                                                                                               | **72 个文件、304 个断言通过，0 失败**                                                  | 包含三类详情、Store、ArrayInput、ConfigReference 等现有回归；桥接测试通过不表示 V3 已移除      |
| `corepack yarn build:packages`                                                                                                    | 退出 0，appstore/console/core/shared 均构建完成                                        | 后续类型修正后又使用同一个 Rollup 配置重建 console 的 es/cjs，均成功                           |
| 变更生产文件 `eslint`                                                                                                             | 退出 0                                                                                 | 限当前 5 个修改/新增生产 TS/TSX 文件                                                           |
| 变更文件 `prettier`、`git diff --check`、`git diff --cached --check`                                                              | 通过                                                                                   | 格式检查不能替代功能验证                                                                       |
| `tsc -p packages/console/tsconfig.json --noEmit --incremental --tsBuildInfoFile /tmp/workload-console-check-20261023.tsbuildinfo` | **未通过**，存在 rootDir/文件列表和既有类型诊断；本次新增的 InputNumber 类型错误已修复 | 不能报告全项目 TypeScript 通过                                                                 |
| 同配置 TypeScript 编译器内存覆盖基线对照                                                                                          | 基线 1325 项 / 当前 1325 项，新增 0，本轮文件直接诊断 0                                | 见 [对照摘要](./evidence/workload-settings-dev-typecheck-20261023.json)；原项目问题仍未关闭    |
| `v4-module-gate.py workloads start/commit --phase DEV`                                                                            | Git、阶段结构、证据摘要检查通过                                                        | 不证明模块内容验收、部署或浏览器通过                                                           |

console 定向重建复用 `scripts/libs/create-rollup-config.js`，分别传入 `basePath=packages/console`、`format=es/cjs`，执行 Rollup `write` 和 `close`。构建保留了既有循环依赖警告，没有将警告写成错误或隐去。TypeScript 第一次使用 `--incremental false` 被 composite 项目以 TS6379 拒绝；改用上表的临时 build info 路径后才取得真实诊断。

## 131 环境身份与未执行验证

2026-10-23 只读回读确认 context 为 `default`，API 为 `https://192.168.2.131:6443`：

- Deployment：`kubesphere-system/ks-console`，副本数 `1`。
- 当前环境镜像仍为历史 tag `feature-v4-workloads-20261022-215739-27aaeced74e8`。
- Pod：`ks-console-6b9c55b7b5-2v5fg`，Running，容器 Ready。
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179`。

**本轮没有为 `0c1d9aadf` 构建/推送测试镜像，没有更新 Deployment，没有 rollout，也没有在该 SHA 的部署制品上做 Playwright。** 当前阶段仍有 DEV 缺口；旧页面、旧 tag 和旧 imageID 不能作为新代码的验收结果。

## 剩余清单

- 三类资源完整设置：调度、Pod 元数据、安全及高级容器字段、StatefulSet Service/PVC 模板编辑等仍须按原矩阵补齐，不能因本轮接入设置入口而关闭 WL-02。
- 集群级三类列表仍挂载 V3/Wujie。现有候选原生列表还含创建空回调，不能直接接路由后宣称完成。
- StatefulSet、DaemonSet 创建和各类 Action 仍需继续补齐；DaemonSet 停止语义尚未修复。
- 配置引用的 V3 Action/DOM 桥接尚未移除；WL-04 保留。
- 真实 RBAC 正反权限、namespace 隔离、缓存失效、API 持久化、保存/取消/冲突及当前制品渲染未完成。
- 三类资源分别完成 DEV 后，再按门禁构建当前 SHA 镜像、部署 131 并执行 Playwright；PR #2 保持 Draft，不自动合并。
