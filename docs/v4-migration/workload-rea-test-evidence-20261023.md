# Workload REA 阶段测试证据

## 1. 执行身份

| 项目     | 内容                                              |
| -------- | ------------------------------------------------- |
| 模块     | `workloads`                                       |
| 资源     | Deployment、StatefulSet、DaemonSet                |
| 分支     | `feature/v4-workloads`                            |
| 执行提交 | `3f6d71d41cccd956185621e54a3f3be894338174`        |
| 执行方式 | 单 Codex 会话；并行启动互不依赖的本地只读测试进程 |
| 阶段     | `REA` / 分析中，待负责人复核                      |

## 2. 实际命令

本轮没有修改业务代码、构建镜像或部署集群。对已经存在的 Workload、配置引用和作用域测试逐个使用仓库指定的 `esno` 入口执行：

```bash
./node_modules/.bin/esno <测试文件>
```

执行文件如下：

```text
packages/console/src/pages/projects/components/ConfigReference/bridge.test.ts
packages/console/src/pages/projects/components/ConfigReference/draft.test.ts
packages/console/src/pages/projects/components/ConfigReference/entry.test.ts
packages/console/src/pages/projects/components/ConfigReference/nativeEdit.test.ts
packages/console/src/pages/projects/components/ConfigReference/summary.test.ts
packages/console/src/pages/projects/components/ConfigReference/workload.test.ts
packages/console/src/pages/projects/components/WorkloadCreateModal/ContainerInput.test.ts
packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.test.ts
packages/console/src/pages/projects/components/WorkloadCreateModal/index.test.ts
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/native.test.ts
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/native.test.ts
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/native.test.ts
packages/console/src/pages/projects/containers/workloadScope.test.ts
packages/shared/src/stores/workload/index.test.ts
packages/shared/src/utils/workloadRevision.test.ts
```

## 3. 结果

| 范围                       | 文件数 |  断言数 |    通过 |  失败 |
| -------------------------- | -----: | ------: | ------: | ----: |
| ConfigReference            |      6 |      53 |      53 |     0 |
| WorkloadCreateModal        |      3 |      20 |      20 |     0 |
| 三类详情页静态契约         |      3 |       4 |       4 |     0 |
| 项目 Workload 作用域与列表 |      1 |      12 |      12 |     0 |
| Workload Store             |      1 |      19 |      19 |     0 |
| Workload revision          |      1 |       1 |       1 |     0 |
| **合计**                   | **15** | **106** | **106** | **0** |

## 4. 结果解释

已通过的测试证明：

- 原生 Deployment 编辑设置的解析、构造、校验及部分字段保留测试可运行。
- 三类项目详情页的静态 V4 入口检查可运行；Deployment 的设置入口检查为原生表单。
- 项目列表操作的权限参数、cluster/namespace 传递和列表刷新回归可运行。
- Workload 删除、批量删除、停止和 HPA 清理的错误传播测试可运行。
- 配置引用草稿合并、取消、失败重试和当前桥接行为测试可运行。

## 5. 明确限制

这批测试不能证明以下事项：

1. StatefulSet 和 DaemonSet 已拥有与旧 V3 等价的原生编辑设置；现有静态证据仍显示两者的“编辑设置”调用 YAML 编辑器。
2. 集群级三类 Workload 列表已经移除 Wujie/V3；相关主入口仍挂载 `/consolev3`。
3. 配置引用已移除 `useV3action`、Wujie Shadow DOM 和 V3 编辑器；其中部分通过测试恰好验证了现有桥接行为仍存在。
4. 当前提交已构建、部署到 131，或在当前提交上完成 Playwright 页面验收。
5. Kubernetes API 的真实 403/404/409、低权限 RBAC、跨 namespace 隔离、缓存隔离和持久化行为已经通过。
6. 全仓库 `scripts/test.sh`、`corepack yarn build:packages`、完整 lint、镜像构建和部署链路已经通过。

## 6. REA 结论

这批测试结果作为 REA 输入归档，不能关闭 `WL-01`～`WL-04`，也不能改变 `module-execution.json` 的阶段、覆盖状态或 `rea.review`。当前仍为：

**REA / 分析中，待负责人复核；不进入 DEV。**
