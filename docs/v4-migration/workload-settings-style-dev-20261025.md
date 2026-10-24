# Workload 编辑设置样式 DEV 增量记录（2026-10-25）

## 1. 变更边界

- 模块：`workloads`
- 资源：Deployment、StatefulSet、DaemonSet 共用的 `WorkloadSettingsModal`
- 当前分支：`feature/v4-workloads`
- Worktree：`/home/bruce/code/ks-develop/console-workloads`
- 代码提交：`1be276245`
- 基线：`release-4.1.5` 已部署页面在 1280×720 视口下的编辑设置弹窗宽度为 `1162px`
- 变更：将 V4 原生编辑设置弹窗宽度从 `960` 调整为 `1162`，保留现有三类资源字段、原生 API 和错误处理逻辑。

本增量没有重新引入 V3/Wujie，也没有修改稳定分支、集成分支或测试资源。

## 2. TDD 记录

先在 `WorkloadSettingsModal.test.ts` 增加基线宽度断言，再运行测试：

```text
Expected values to be strictly equal:
960 !== 1162
tests: 2 passed, 1 failed
```

失败原因与已确认的 release-4.1.5 页面差异一致。随后修改生产组件宽度，重新运行同一测试文件：

```text
tests: 3 passed, 0 failed
```

## 3. 本地验证

| 检查                                                                                                                        | 结果                              |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `./node_modules/.bin/esno packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.test.ts` | 3/3 通过                          |
| WorkloadCreateModal 目录 19 个测试文件                                                                                      | 全部通过                          |
| `./scripts/test.sh`                                                                                                         | 91 个测试文件、403 个断言全部通过 |
| `corepack yarn build:packages`                                                                                              | 通过；634 个 minify 项完成        |
| `git diff --check`                                                                                                          | 通过                              |
| Prettier / 中文提交检查                                                                                                     | 通过                              |

构建输出包含已有的循环依赖警告，构建过程成功完成；本增量没有新增该警告。

## 4. 尚未完成

- 新代码尚未构建镜像、部署到 131 或使用新制品进行浏览器验收。
- 仅完成弹窗宽度对齐；Tab 内容切换、弹窗高度、完整布局和三类资源的逐项视觉/交互等价仍需在 VERIFY 中重新核对。
- 低权限 RBAC、缓存、错误路径和完整 V3 功能等价仍未闭环。

因此本记录只证明该 DEV 增量的本地测试和构建通过，不代表 Workload 模块已完成 DEV、VERIFY 或 PR。
