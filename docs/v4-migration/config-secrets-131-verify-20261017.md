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

## 脱敏修复后的补充复验

- 修复提交：`8275096ab220b2eb813c1b27e043efa4ea4f2da0`
- 修复内容：Secret 原生详情页默认使用固定掩码 `******`，不再回显 `_originData.data` 中的 Base64 数据；主动切换显示的行为保留
- 本轮镜像：`feature-v4-configmaps-secrets-20261017-175822-8275096ab220`
- 镜像 digest：`sha256:9ca9d048bd767512929ef01a743e6bfe0bf73954e6ac46f13170a655364ac5cd`
- GitHub Actions：Run `39023050476`；Unit tests 和 Build and publish 均通过
- Deployment：generation/observedGeneration 为 `506/506`，`ks-console-6d59c9fb67-8td2j` 为 Running/Ready
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:9ca9d048bd767512929ef01a743e6bfe0bf73954e6ac46f13170a655364ac5cd`
- Playwright：登录后直达 Secret 详情页，默认数据区域显示 `******`；浏览器刷新后仍显示 `******`，没有在快照或报告中输出测试值
- 清理：`v4-secret-mask-20261017` 已删除，API 复核为 NotFound；namespace 保留

## 当前制品的登录与页面渲染复验

- 修复提交：`259b556eccd19fbbbade8392db4954f195672114`
- 修复内容：收窄 Secret 类型、字段数量和创建时间列，给名称列保留可用空间；项目级和集群级 Secret 列表同时调整
- 本轮镜像：`feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`
- 镜像 digest：`sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`
- GitHub Actions：Run `39027793096`；Unit tests 和 Build and publish 均通过
- Deployment：`kubesphere-system/ks-console` generation/observedGeneration 为 `507/507`，副本、Ready、Updated、Available 均为 `1`
- Pod：`ks-console-69fc77bb7b-gbb2j` 为 Running/Ready；imageID 为 `ghcr.io/mysstack/ks-console@sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`
- 登录：使用新建 Playwright 会话从 `/login` 登录，成功进入 `/dashboard`；账号密码来自 `/home/bruce/.bashrc`，没有写入日志或文档
- 页面渲染：登录后实际打开并截图检查以下页面，标题、侧边导航、工具栏、表格和数据行均完成渲染：
  - Secret：`/test-workspace/clusters/host/projects/v4-migration-e2e/secrets`；名称列实测约 `253px`，长名称不再逐字挤压；本地截图 `.playwright-cli/page-2026-10-17T11-19-45-106Z.png`
  - ConfigMap：`/test-workspace/clusters/host/projects/v4-migration-e2e/configmaps`；显示 10 行数据；本地截图 `.playwright-cli/page-2026-10-17T11-20-25-903Z.png`
  - ServiceAccount：`/test-workspace/clusters/host/projects/v4-migration-e2e/serviceaccounts`；显示 `default` 数据行；本地截图 `.playwright-cli/page-2026-10-17T11-20-57-218Z.png`
- 页面功能结论：上述页面在真实登录会话中可访问并完成渲染；这只证明当前入口可用，不代表三个模块的编辑、引用、低权限 RBAC 和完整隔离已验收
- 浏览器控制台：登录后仍记录 `common is not defined`、`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 等全局/扩展错误；这些错误没有阻止本轮三个列表页面显示，但仍是未关闭问题

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

| 检查项                         | 结果                 | 证据                                                                                                                              |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 原生列表和项目筛选             | 通过                 | 原生 `/test-workspace/clusters/host/projects/v4-migration-e2e/secrets` 可访问并按项目筛选                                         |
| 创建                           | 通过                 | 原生创建弹窗创建 `v4-secret-20261017-0902`；API 仅复核 type、namespace 和 data key，未输出 Secret 值                              |
| 数据脱敏                       | 初次失败，修复后通过 | 初始制品曾直接显示 Base64；`8275096ab` 修复后，在 131 直达详情页和刷新后均显示固定掩码 `******`，测试值未写入文档、测试报告或提交 |
| 详情、历史、元数据、事件       | 部分通过             | 详情、`revision-control`、`metadata`、`events` 路由均可打开；详情页暴露数据导致后续编辑验证停止                                   |
| 编辑、YAML、批量删除、配置引用 | 未完成               | 发现数据暴露后停止继续写操作，避免扩大敏感数据暴露                                                                                |
| namespace 隔离                 | 部分通过             | 列表支持项目筛选；缺少低权限账号和跨 namespace 的完整正反权限验证                                                                 |
| RBAC 正反路径                  | 阻塞                 | 没有低权限测试账号，不能用 admin 模拟拒绝路径                                                                                     |

初次验证发现数据暴露后，立即删除了 `v4-secret-20261017-0902`。修复后重新创建的 `v4-secret-mask-20261017` 已完成默认脱敏和刷新复验，并在复验结束后删除。Secret 仍不能标记为已验收，原因转为编辑、YAML、配置引用、低权限 RBAC 和完整 namespace 隔离尚未完成。

## 共同限制

- 登录页及详情页 Playwright Console 日志出现 `ReferenceError: common is not defined`；登录后还持续出现 `getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 未定义。页面仍能完成登录并加载本轮原生 Secret 详情，但不能据此宣称浏览器无运行时错误。
- `common is not defined` 在当前修复制品以及历史 Playwright 日志中均出现，暂不能归因于本次 Secret 脱敏修改；应作为全局 DLL/主 Bundle 或扩展初始化问题单独定位和关闭。
- 页面控制台仍有已知扩展错误：`getExtensionConsoleV3Embed is not a function`、`ConfigConstants` 未定义以及 `getStoreWithQueryHooks`。这些错误在部署前页面已存在，未阻止本轮 ConfigMap/Secret 原生页面加载，但仍需单独跟踪。
- 项目概览仍能看到指向 `/consolev3` 的历史链接；本轮资源原生页面没有依赖 V3 弹窗，但这说明全局 V3 清理仍未完成。
- 低权限账号、跨 namespace 正反权限和配置引用工作负载均未具备完整测试条件。

## 当前结论

ConfigMap：**部分通过，未验收**。Secret：**脱敏修复后部分通过，仍待补齐**。本记录不改变全局 P0 状态，不授权进入 Deployment 模块，也不改变 PR #1 的 Draft 状态。

## 2026-10-17 项目 namespace 作用域修复

本轮针对浏览器页面显示“全部项目”以及项目级资源可能加载全量 namespace 数据的问题完成代码修复。项目路由本身包含 `:namespace`，但旧实现没有把该参数传给通用 `ListPage` 的资源 URL；因此 ConfigMap 和 Secret 使用了集群级请求，页面也显示了跨项目选择器。

- 修复提交：`00310f5e5a3105f177e9e8d413db359f26bbd1d1`
- 修复范围：项目 ConfigMap、Secret、ServiceAccount 列表隐藏跨项目选择器；ConfigMap/Secret 使用当前 namespace 的资源 URL；创建弹窗锁定当前 namespace
- 本地验证：ConfigMap 定向测试 2/2、Secret 定向测试 4/4、ServiceAccount 定向测试 2/2；`./scripts/test.sh` 为 56 个文件、225 个测试通过；相关 ESLint、Prettier、`git diff --check` 和 `corepack yarn build:packages` 通过
- GitHub Actions：Run `39031017563`；Unit tests 和 Build and publish 均通过
- 候选镜像：`feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`
- 候选镜像 digest：`sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`

131 部署尝试记录：`ks-console` generation/observedGeneration 达到 `508/508`，新 Pod `ks-console-699dd9c46f-ldvtc` 被调度到 `dev01`，但约 6 分钟仍停在 `ContainerCreating`，事件只有 `Pulling image`，没有形成 Pod imageID 或 Ready 状态。`rollout status --timeout=300s` 超时后按授权执行 `kubectl rollout undo deployment/ks-console -n kubesphere-system`，回滚成功；当前 Deployment 恢复使用上一版镜像 `feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`，运行中 Pod imageID 为 `sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`。

由于候选镜像没有完成 rollout 和 Ready，**本轮尚未在该修复制品上执行浏览器登录、页面渲染和 namespace 数据范围验收**。因此不能把项目 namespace 作用域修复标记为部署后通过；ConfigMap、Secret 仍为“VERIFY 部分通过，待补齐”。

## 2026-10-17 修复制品重新部署与浏览器复验

第二次部署继续使用同一候选镜像，确认第一次失败是拉取过程超过 rollout 超时后被回滚取消；本次镜像拉取完成并成功启动：

- Deployment generation/observedGeneration：`510/510`
- Pod：`ks-console-699dd9c46f-jstfd`，Running/Ready
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`
- 事件：镜像成功拉取，耗时约 `1m23.914s`；rollout 成功

在已登录的 Playwright 会话中直接访问并检查：

- Secret：项目页面不再显示“全部项目”，表格 2 行的项目列均为 `v4-migration-e2e`
- ConfigMap：项目页面不再显示“全部项目”，表格 1 行的项目列为 `v4-migration-e2e`
- 刷新和浏览器返回：Secret 页面仍回到原项目路由，选择器保持隐藏，表格行数保持 2
- 截图：`.playwright-cli/page-2026-10-17T12-25-30-293Z.png`、`.playwright-cli/page-2026-10-17T12-25-35-674Z.png`

本次证明项目 ConfigMap/Secret 页面已经按当前 namespace 渲染，且没有再显示跨项目选择器。浏览器控制台仍有既有的 8 个全局/扩展错误，未影响本轮列表渲染；编辑、配置引用、低权限 RBAC 和完整隔离仍未验收。

## 漏测复盘与后续检查要求

本问题不是 131 的 namespace 配置错误，而是项目页面作用域没有纳入原有回归断言。修复前测试只检查原生组件和 Store，浏览器检查只确认页面可渲染，缺少当前 namespace URL、选择器状态、可见行项目列、刷新和浏览器返回的组合验证。后续 ConfigMap/Secret VERIFY 必须逐项保留这些证据，不能以“页面显示成功”代替作用域验证。

## 2026-10-17 主流程收尾复核

本轮没有修改业务代码，也没有在 131 执行新的创建、编辑、删除或其他状态变更。针对当前模块的本地回归重新核对完成：ConfigMap、Secret、ServiceAccount 列表与详情相关测试，以及 ConfigReference、ConfigHistory、Secret 脱敏测试共 19 个测试文件、114 个用例通过。该结果只证明本地代码级回归通过，不能替代已部署制品上的浏览器和 RBAC 验证。

当前 131 运行状态仍为：Deployment generation/observedGeneration `510/510`，Pod `ks-console-699dd9c46f-jstfd` 为 Running/Ready，部署镜像 tag 为 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`，Pod imageID 对应 digest 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`。此前已在该制品上完成项目 namespace 列表渲染、刷新和返回路径验证；当前浏览器会话已失效，新的独立登录被测试环境拒绝，因此本轮不能补记新的登录闭环。

独立登录阻塞项只记录为环境问题：测试账号需要由负责人轮换或恢复，轮换前不继续尝试，也不在日志、截图、文档或测试配置中记录凭据。ConfigMap/Secret 的数据编辑、YAML 持久化、配置引用工作负载、低权限 RBAC 和完整跨 namespace 正反路径仍未完成，三个模块继续保持“VERIFY 部分通过，待补齐”。
