# ConfigMap / Secret 模块级 VERIFY 记录（2026-10-17）

## 范围和制品

- 仓库：`mysStack/console`
- 分支：`feature/v4-configmaps-secrets`
- Git HEAD：`5e12c0ec3f4cfe295cb57859a19ae8b913661f5f`
- 测试环境：`192.168.2.131:30880`
- Kubernetes context：`default`
- 测试 namespace：`v4-migration-e2e`；本轮创建，保留 namespace，不删除
- 镜像 tag：`feature-v4-configmaps-secrets-20261017-164719-5e12c0ec3f4c`
- 镜像 digest：`sha256:a2600930a7f5e199e4a2f8db49669b4dd16bf26c4330fdf7cb82ab5be32b30ac`
- Deployment：`kubesphere-system/ks-console`
- Pod：`ks-console-7d9db89b78-tcjj7`
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:a2600930a7f5e199e4a2f8db49669b4dd16bf26c4330fdf7cb82ab5be32b30ac`
- GitHub Actions：`39018611070`，构建和发布 Job 均成功
- Playwright artifact 目录：`output/playwright/v4-configmaps-secrets-20261017/`

部署检查：Deployment generation/observedGeneration 为 `505/505`，副本、Ready、Updated、Available 均为 `1`；rollout 成功。登录使用 `/home/bruce/.bashrc` 中的专用测试账号，未将账号密码写入本记录。

## ConfigMap

| 检查项             | 结果     | 证据                                                                                                                                         |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 原生列表和项目筛选 | 通过     | 原生 `/test-workspace/clusters/host/projects/v4-migration-e2e/configmaps`；筛选后仅显示该项目的 2 个现有对象，测试对象创建后列表总数即时变化 |
| 创建               | 通过     | 通过原生创建弹窗创建 `v4-cm-20261017-0902`，API 复核 namespace、名称和字段存在                                                               |
| 详情、直达 URL     | 通过     | 原生详情页显示属性和数据，路由进入 `/configmaps/v4-cm-20261017-0902/detail`                                                                  |
| 元数据编辑         | 通过     | 原生“编辑信息”修改别名和描述，详情及元数据页均显示修改结果                                                                                   |
| 数据编辑           | 未完成   | 打开原生“编辑设置”和“编辑 YAML”入口；本轮未提交数据修改，避免把未确认的编辑器状态记为通过                                                    |
| YAML 入口          | 部分通过 | 原生“编辑 YAML”可打开并显示当前对象；提交修改未形成可确认的持久化结果                                                                        |
| 修改记录           | 通过     | `revision-control` 显示变更记录                                                                                                              |
| 元数据、事件       | 通过     | `metadata` 显示注解；`events` 页面可访问，当前对象无事件行                                                                                   |
| 批量删除           | 通过     | 原生选择两个带测试标签的 ConfigMap，输入名称确认后批量删除；三个对象均经 API 复核为 NotFound                                                 |
| 单项删除           | 通过     | 原生详情/列表删除 `v4-cm-20261017-0902`，API 复核为 NotFound                                                                                 |
| 缓存刷新           | 通过     | 创建、刷新、删除后列表数量和行数据同步变化                                                                                                   |
| 配置引用           | 未验证   | 本轮没有创建工作负载引用测试对象，未把该项标记为通过                                                                                         |
| RBAC 正反路径      | 阻塞     | 当前环境仅有 admin 测试凭据；没有低权限账号，未使用 admin 模拟拒绝路径                                                                       |

本轮只清理了 `v4-cm-20261017-0902`、`v4-cm-batch-a-20261017` 和 `v4-cm-batch-b-20261017`，三者均已确认 NotFound。`kube-root-ca.crt` 等既有对象未修改。

## Secret

| 检查项                         | 结果                   | 证据                                                                                                         |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 原生列表和项目筛选             | 通过                   | 原生 `/test-workspace/clusters/host/projects/v4-migration-e2e/secrets` 可访问并按项目筛选                    |
| 创建                           | 通过                   | 原生创建弹窗创建 `v4-secret-20261017-0902`；API 仅复核 type、namespace 和 data key，未输出 Secret 值         |
| 数据脱敏                       | **失败，阻塞模块验收** | 原生详情页初始状态直接显示 Secret 数据的 Base64 文本，未达到“默认脱敏”的要求；该值未写入文档、测试报告或提交 |
| 详情、历史、元数据、事件       | 部分通过               | 详情、`revision-control`、`metadata`、`events` 路由均可打开；详情页暴露数据导致后续编辑验证停止              |
| 编辑、YAML、批量删除、配置引用 | 未完成                 | 发现数据暴露后停止继续写操作，避免扩大敏感数据暴露                                                           |
| namespace 隔离                 | 部分通过               | 列表支持项目筛选；缺少低权限账号和跨 namespace 的完整正反权限验证                                            |
| RBAC 正反路径                  | 阻塞                   | 没有低权限测试账号，不能用 admin 模拟拒绝路径                                                                |

发现数据暴露后，立即通过原生删除流程删除 `v4-secret-20261017-0902`，API 复核为 NotFound；测试 namespace 保留。该问题必须先修复并重新执行 Secret 的脱敏、编辑和错误路径验证，Secret 不能标记为已验收。

## 共同限制

- 页面控制台仍有已知扩展错误：`getExtensionConsoleV3Embed is not a function`、`ConfigConstants` 未定义以及 `getStoreWithQueryHooks`。这些错误在部署前页面已存在，未阻止本轮 ConfigMap/Secret 原生页面加载，但仍需单独跟踪。
- 项目概览仍能看到指向 `/consolev3` 的历史链接；本轮资源原生页面没有依赖 V3 弹窗，但这说明全局 V3 清理仍未完成。
- 低权限账号、跨 namespace 正反权限和配置引用工作负载均未具备完整测试条件。

## 当前结论

ConfigMap：**部分通过，未验收**。Secret：**失败，阻塞模块验收**。本记录不改变全局 P0 状态，不授权进入 Deployment 模块，也不改变 PR #1 的 Draft 状态。
