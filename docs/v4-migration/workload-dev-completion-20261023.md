# Workload DEV 完成记录

## 交付身份

- 模块：`workloads / deployment-statefulset-daemonset`。
- 分支 / Worktree：`feature/v4-workloads` / `/home/bruce/code/ks-develop/console-workloads`。
- DEV 源提交：`7287c6b82fafe425aeb67d848b8e9bc1f689bd35`。
- 当前阶段结论：页面批量删除 Hook 已复用完整关联资源清理路径，DEV 修复完成并重新进入 VERIFY；本记录不表示新 SHA 部署或浏览器重验已经通过。

## DEV 验收清单

| 条目                                       | DEV 结论                       | 代码与测试证据                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WL-01 入口、详情、设置分区与路由           | 已完成代码交付                 | 项目级和集群级 Deployment、StatefulSet、DaemonSet 使用原生列表、详情、创建与设置组件；集群主路由不再挂载三类 V3 Embed                                                          |
| WL-02 公共字段与资源差异                   | 已完成代码交付                 | 三类资源分别处理更新策略；StatefulSet 支持 Service/PVC 模板；DaemonSet 不生成 replicas；原始未知字段和 resourceVersion 保留                                                    |
| WL-03 Action/API/Store、作用域、错误与取消 | 已完成可进入 VERIFY 的代码交付 | 原生编辑、YAML、回滚、重启、删除、伸缩/HPA、Service 编辑和批量停止/删除入口保留；回滚目标恢复必填校验；StatefulSet 双资源创建先 dry-run，实际创建失败时避免或回收 Service 残留 |
| WL-04 ConfigReference V3 桥接              | 已完成代码交付                 | 普通 Workload 配置引用不再调用 `useV3action`、Wujie Shadow DOM 或 V3 编辑器桥接                                                                                                |

当前代码没有把旧镜像、旧浏览器记录或 API dry-run 当成 VERIFY 结果。RBAC、namespace 隔离、缓存刷新、真实持久化、成功/失败/取消路径和 V3 功能等价性均转入当前 SHA 的部署后验证清单。

## 最终本地验证

| 检查                           | 结果                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `./scripts/test.sh`            | 81 个测试文件、363 项通过，0 失败                                                    |
| `corepack yarn build:packages` | 通过；四个 package 构建完成，shared 压缩 633/633                                     |
| 变更文件 ESLint                | 0 错误、0 警告                                                                       |
| Prettier、`git diff --check`   | 通过                                                                                 |
| 完整 TypeScript                | 仓库仍有 1316 条既有诊断，不能登记为通过；此前同配置对照未发现本模块新增生产文件诊断 |

回滚版本必填修复提交为 `cf4cfc2ba2cf27ebd241b41f4e93f24317734e74`；StatefulSet 创建残留回收提交为 `0a44f5706d1a6ba9b266360caa2d4128d8bb08a2`。后者的 Store 定向回归为 24/24，通过 Service 创建失败不发送 Workload、Workload 创建失败删除本轮 Service 两条失败路径。

首次 VERIFY 在精确 SHA `cc3b04c2a3408538e45bdd81c7e804413e527f2f` 上通过浏览器创建并删除 StatefulSet 后，API 回读发现随机生成的 Headless Service 仍存在。该结果按状态机将模块退回 DEV。提交 `b1ec3593d479ddbb3548e495d77085ccaeb13191` 为原生创建的 StatefulSet 登记 `kubesphere.io/related-service`，单项删除和批量删除仅在 `statefulsets` Store 中清理该登记 Service，Deployment 不响应同名注解。新增测试先复现 3 项失败，实现后转换测试 65/65、Store 测试 26/26、完整回归 81 文件/363 项及包构建通过；遗留测试 Service 已单独删除，namespace 保留。修复后的真实创建/删除仍须部署该精确 SHA 后重新验证。

第二轮 VERIFY 在精确 SHA `c721dce0491e82fc563dee2532a812a548ef9a72` 上确认单项删除会清理配套 Service，但浏览器批量删除两个专用 StatefulSet 后，两个带登记关系的 Headless Service 均残留。代码定位确认页面使用 `useBatchDeleteWorkloadMutation`，而上一轮测试与修复落在直接 `batchDelete`；Hook 仍只执行 Workload 删除。该问题不是环境阻塞，必须退回 DEV，以页面真实调用路径的失败测试和实现修复关闭。

提交 `7287c6b82fafe425aeb67d848b8e9bc1f689bd35` 将 `useBatchDeleteWorkloadMutation` 改为复用 `batchDelete`，同时保留 StatefulSet 配套 Service、三类资源关联 HPA 的清理和完整失败传播。新增测试针对页面实际 Hook，修复前为 26/27、修复后为 27/27；完整回归为 81 文件/364 项通过，包构建完成，变更文件 ESLint、Prettier 与 `git diff --check` 通过。新 SHA 的镜像、rollout、Pod imageID 和批量删除浏览器重验仍属于 VERIFY。

## VERIFY 必须完成

1. 按当前 DEV 源提交构建并推送镜像，记录 CI Run、tag、digest、rollout 和 Pod imageID。
2. 在 131 专用 namespace 创建三类资源，验证列表、详情、创建、设置、YAML、回滚、重启、删除、批量操作和资源特有行为。
3. 使用有权限与低权限身份验证 RBAC 正反路径，并验证项目/namespace 切换、直达 URL、刷新、返回和缓存隔离。
4. 对 StatefulSet 双资源创建执行真实成功路径，并用可控请求失败验证补偿结果；只清理本轮唯一标签资源。
5. 用 Playwright 验证部署后真实页面渲染、Network 请求、错误提示、取消行为和无 V3/Wujie 回退。

任一必要场景未执行或失败时，对应资源保持“测试中”，不得进入 PR 阶段。
