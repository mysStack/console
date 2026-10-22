# Deployment 原生创建 131 验证记录（2026-10-22）

## 结论

项目级 Deployment 原生创建第一批功能已完成源码实现、本地回归、CI 构建、131 部署和真实浏览器验收。创建、取消、重复名称失败、刷新、原生详情、浏览器返回、UI 删除和列表缓存刷新均已通过；创建与详情流程没有发起 `/consolev3` 业务请求。

本批仅覆盖名称、别名、描述、副本数、单容器名称、镜像和镜像拉取策略。多容器、初始化容器、端口、环境变量、探针、资源限制、存储卷、镜像凭据、调度、安全上下文和高级设置尚未实现，因此 Deployment 模块状态仍为“开发中，VERIFY 部分通过”，不得标记为已验收。

## 源码与提交

| 提交                                       | 内容                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `b84eccc56`                                | 增加项目 Deployment 原生创建入口、对象构造、Mutation 和单元测试 |
| `caf9cd6dd`                                | 将不受当前组件库支持的 `NumberInput` 修正为 `InputNumber`       |
| `a05a96518fcfe3189c213e5c057cdeec4f37e850` | 补齐中英文文案、重复名称错误反馈和 Mutation `onError` 回归      |

当前分支为 `feature/v4-configmaps-secrets`，本轮最终 HEAD 与远程分支一致。Draft PR #1 保持未合并。

## 模块 REA 输入

当前 `v3dist` SHA-256 为 `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4`。本轮对 Deployment 创建相关 Chunk 做了两次 focused REA：

- 第二次收据 `ev_06201f7208bb80a18d8c1dfe8ffa4d35140e7d47bc4c080185660378f62c1c1f`，父证据 `ev_262589fd4558a51d78ac7dc539d4936246e06ae39737683903e905b72a7fde36`；覆盖 `main.558...`、`3.bb6...`、`12.2...` 三个文件、4,959,801 字节、64 项发现。
- 第一轮和第二轮均为 `partial`。第一轮解析三个文件、6,129,520 字节、88 项发现；第二轮主 Chunk 的语义 worker 因堆内存限制未完成，并保留 71,162 个 semantic unknown。
- REA 与 `origin/release-3.4` 旧源码共同确认：V3 创建入口来自 `workload.create`，创建流程包含基础信息、容器、存储和高级设置；Deployment 模板使用 `apps/v1`、默认 ServiceAccount、RollingUpdate `25%/25%`，基础信息会把 `app` 标签同步到 selector 与 Pod template。
- `origin/release-3.4` 只作为旧行为参考，不能证明它是当前 `v3dist` 的完整对应源码；REA 部分结果也不能替代运行时验收。

## 本地验证

| 命令                                                              | 结果                              |
| ----------------------------------------------------------------- | --------------------------------- |
| `./scripts/test.sh`                                               | 74 个测试文件、252 项测试全部通过 |
| `corepack yarn eslint <本轮 TypeScript 文件>`                     | 通过                              |
| `corepack yarn prettier --check <本轮文件>`                       | 通过                              |
| `corepack yarn tsc --noEmit -p packages/shared/tsconfig.json`     | 通过                              |
| `corepack yarn build:packages`                                    | 通过                              |
| `NODE_OPTIONS=--openssl-legacy-provider corepack yarn build:prod` | 通过，只有既有构建警告            |
| `git diff --check`                                                | 通过                              |

CI Run `39719303168` 曾因 `@kubed/components` 不导出 `NumberInput` 失败，提交 `caf9cd6dd` 修复。最终 CI Run [39722386439](https://github.com/mysStack/console/actions/runs/39722386439) 在提交 `a05a96518` 上成功。

## 部署身份

| 项目                  | 实际值                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| 镜像 tag              | `feature-v4-configmaps-secrets-20261022-122739-a05a96518fcf`                                          |
| OCI digest            | `sha256:842c057345bfcea3edb6af388ff8db5b3260fc98b6f813a8f7f7b7195235da24`                             |
| Deployment generation | `565/565`                                                                                             |
| 副本                  | `1/1 Ready`                                                                                           |
| Pod                   | `ks-console-78bbfbb5ff-qxnvq`，Running，0 次重启                                                      |
| Pod imageID           | `ghcr.io/mysstack/ks-console@sha256:842c057345bfcea3edb6af388ff8db5b3260fc98b6f813a8f7f7b7195235da24` |

部署前镜像为提交 `caf9cd6dd` 对应制品，generation 为 `564/564`。本轮 rollout 成功，无需执行已准备的回滚。

## 真实浏览器验收

从 `/login` 使用专用测试账号登录，在 namespace `v4-migration-e2e` 的项目 Deployment 页面执行以下检查：

| 检查                         | 结果                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 原生列表、创建入口和中文文案 | 通过；显示“创建部署”“副本数量”，没有裸翻译键                                                                 |
| namespace 作用域             | 通过；创建表单固定且禁用 namespace 输入，值为 `v4-migration-e2e`                                             |
| 取消创建                     | 通过；没有产生 Kubernetes 对象                                                                               |
| 创建请求                     | 通过；`POST /clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/deployments` 返回 `201`                  |
| Kubernetes 对象              | 通过；replicas、`app` 标签、selector、Pod template、默认 ServiceAccount、容器和 RollingUpdate 均符合本批定义 |
| 列表缓存和刷新               | 通过；创建后无手动刷新即可看到资源，浏览器刷新后仍存在                                                       |
| 原生详情和路由               | 通过；进入 `.../deployments/:name/resource-status`，浏览器返回恢复列表                                       |
| 重复名称                     | 通过；第二次 POST 返回 `409`，弹窗保留并显示“创建部署失败。”                                                 |
| UI 删除                      | 通过；DELETE 返回 `200`，列表立即移除，API 回读对象不存在                                                    |
| V3/Wujie 依赖                | 通过；本次创建与详情链路没有 `/consolev3` 业务请求                                                           |
| 测试资源清理                 | 通过；本轮资源均已删除，专用 namespace 保留                                                                  |

原始执行结果保存在未提交的本地测试产物目录 `output/playwright/deployment-create-20261022/`，其中包含结构化结果、部署前后身份和截图。产物不含登录凭据和 Secret 明文。

## 浏览器发现与修复

第一次部署后浏览器检查发现两个代码问题：创建标题和副本字段显示裸翻译键；重复名称返回 `409` 后弹窗虽保留，但全局通知关闭时页面没有可见错误。两项均先补失败回归，再在 `a05a96518` 修复并部署复验。

页面同时继续出现既有扩展兼容错误、`common is not defined` 和 Deployment watch WebSocket `403`。本轮创建后的列表主动 refetch 和 UI 状态均正常；按负责人既定范围，扩展运行时错误后置处理。WebSocket `403` 仍需在 Deployment 后续 VERIFY 中专项定位，不能作为已关闭问题。

## 剩余缺口

1. 补齐 V3 四步创建流程中的多容器/初始化容器、端口、环境变量、探针、资源、卷、镜像凭据、调度、安全和高级设置。
2. 验证创建权限的管理员、项目成员和只读账号正反路径，以及 namespace/项目切换后的缓存隔离。
3. 验证完整创建校验、API 失败和网络失败反馈。
4. 继续完成编辑、YAML、伸缩、回滚、重启、删除、配置引用和事件等 Deployment 全量功能等价。
5. 定位 watch WebSocket `403`，确认实时更新的长期行为。
