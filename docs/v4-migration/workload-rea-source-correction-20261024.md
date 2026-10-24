# Workload REA 输入源纠偏记录

## 结论

本模块此前把当前 `v3dist` 的 REA 输入提交记录为 `feature/v4-workloads` 上的
`e67b95ccdfd0b0b98d3e83de393fbfbcd4e172a0`，这不符合项目的固定基线要求。

从本记录开始，Workload 的当前制品 REA 固定使用：

| 输入                   | 正确用途                             | 固定身份                                                                                             |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `release-4.1.5`        | 当前发布制品 `v3dist` 的 REA 目标    | `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`，`v3dist` tree `1e499d92e11374e26c76f5e13be45251602bd596` |
| `release-3.1.4`        | 旧 V3 可读源码的结构、字段和样式参考 | 仅作参考，不作为当前制品来源证明                                                                     |
| `feature/v4-workloads` | V4 重构代码和验证记录                | 不作为当前 V3 制品 REA 的输入源                                                                      |

因此，之前以 `e67b95cc...` 作为当前制品 REA 源提交的记录需要重新绑定；之前以
`origin/release-3.4` 作为旧源码对照的材料只能保留为历史输入，不能直接作为
`release-3.1.4` 的替代证据，也不能继续支撑当前 REA 通过结论。

## 当前核验

在 `console-workloads` 中执行了以下只读核验：

```bash
git rev-parse release-4.1.5
git rev-parse release-4.1.5:packages/bootstrap/assets/v3dist
git rev-parse HEAD:packages/bootstrap/assets/v3dist
git diff --name-only release-4.1.5..HEAD -- packages/bootstrap/assets/v3dist
```

结果为：

- `release-4.1.5` 为 `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`。
- 基线和当前 Workload 分支的 `v3dist` tree 均为
  `1e499d92e11374e26c76f5e13be45251602bd596`。
- `release-4.1.5..feature/v4-workloads` 没有 `v3dist` 文件差异。
- 当前 131 仍运行旧的 `31b6d88fc7e8` 镜像；本次纠偏前构建的新镜像没有部署。

当前工作区没有可直接核验的 `release-3.1.4` 分支或独立旧 V3 源码目录；现有
`origin/release-3.4` 不能冒充该输入。旧源码的确切 commit、路径和许可证需要在
重新进行旧源码对照前补齐。未补齐前，不把旧源码字段或样式对照写成已完成。

## 样式逆向边界

样式可以逆向，而且必须纳入本模块 REA：

- 从 `release-4.1.5` 的 `v3dist` 读取实际 CSS、字体、图标、主题变量和组件结构。
- 用真实 V3 页面和 Playwright 记录 DOM 层级、可见文案、分区顺序、间距、尺寸、
  字体、颜色、边框、滚动、禁用、校验错误、加载、空态和弹窗行为。
- 用浏览器 `getComputedStyle` 和 Network 证据区分实际渲染结果与静态推断。
- 用 `release-3.1.4` 的可读源码解释组件意图和字段关系，但不把旧版本样式直接复制
  成 V4 实现，也不把编译产物还原成原始 TSX。
- V4 交付应使用现有 V4 React、Kubed UI 和设计令牌重建同等布局、密度、状态和交互，
  并通过浏览器截图/DOM/计算样式逐项比较。

编译产物可以证明最终样式和资源事实，但在没有 source map 时不能证明原始 SCSS/TSX
的文件结构。样式 REA 与功能字段、默认值、校验和 Action 证据分别记录，不能用一张
截图替代完整等价性验证。

## 阶段处理

本次纠偏后，`module-execution.json` 退回 `REA`，原先的负责人批准记录保留为历史记录，
不再作为当前分支进入 DEV/VERIFY 的授权。重新绑定 `release-4.1.5` 制品、补齐
`release-3.1.4` 旧源码参考并完成样式/行为矩阵后，再提交新的 REA 复核。
