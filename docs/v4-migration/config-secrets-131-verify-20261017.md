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
| 数据编辑           | 通过     | 通过原生“编辑设置”新增数据键；详情页、API 和刷新后的详情页结果一致，并生成修改记录                                                           |
| YAML 入口          | 部分通过 | 原生“编辑 YAML”可打开并显示当前对象；一次自动化输入导致 HTTP 400，尚未形成有效 YAML 粘贴和持久化证据                                         |
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

本轮没有修改业务代码，也没有在 131 执行新的创建、编辑、删除或其他状态变更。针对当前模块的本地回归重新核对完成：ConfigMap、Secret、ConfigReference、ConfigHistory 和配置编辑相关测试共 19 个测试文件、119 个用例通过。该结果只证明本地代码级回归通过，不能替代已部署制品上的浏览器和 RBAC 验证。

当前 131 运行状态仍为：Deployment generation/observedGeneration `510/510`，Pod `ks-console-699dd9c46f-jstfd` 为 Running/Ready，部署镜像 tag 为 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`，Pod imageID 对应 digest 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`。此前已在该制品上完成项目 namespace 列表渲染、刷新和返回路径验证；当前浏览器会话已失效，新的独立登录被测试环境拒绝，因此本轮不能补记新的登录闭环。

独立登录阻塞项只记录为环境问题：测试账号需要由负责人轮换或恢复，轮换前不继续尝试，也不在日志、截图、文档或测试配置中记录凭据。ConfigMap/Secret 的 YAML 持久化、配置引用工作负载、低权限 RBAC 和完整跨 namespace 正反路径仍未完成，三个模块继续保持“VERIFY 部分通过，待补齐”。

## 2026-10-17 当前修复制品浏览器闭环补充

本轮使用当前 131 已部署的角色缓存修复制品完成真实浏览器登录和页面验收：

- 代码基线：`05450c14f733a1c2e189270f2b257759dadacd8b`
- GitHub Actions：Run `39038790572`，Unit tests 和 Build and publish 均成功
- 镜像 tag：`feature-v4-configmaps-secrets-20261017-215959-05450c14f733`
- 镜像 digest：`sha256:27ef8f71b889c4ddb2a9f19ddf22ce09eb7b148a47bc02a2fa8f482bdfdbab65`
- Deployment：`kubesphere-system/ks-console` generation/observedGeneration `511/511`，rollout 成功
- Pod：`ks-console-56cbbb9df8-ptp5r` Running/Ready，Pod imageID 与上述 digest 一致
- 登录：真实 Playwright 会话从登录页进入项目页面，当前用户页面显示为 `admin / platform-admin`

### ConfigMap

在 `v4-migration-e2e` 项目中通过浏览器完成了专用 ConfigMap 的创建、列表显示、详情直达、元数据描述编辑、YAML 编辑器打开、修改记录、元数据和事件页面访问，以及单项删除。删除后通过 API 和页面刷新确认专用对象及本轮生成的配置历史对象均已清理；没有触碰 `kube-root-ca.crt` 等既有对象。

YAML 编辑器能够正确显示当前对象的 `kind`、`apiVersion`、namespace、描述注解和数据键；该批次没有提交 YAML 数据变更，因此当时的 YAML 持久化仍未验收。后续补充验证见下文。配置引用、低权限 RBAC 和完整跨 namespace 正反路径仍未完成。

### Secret

在同一专用项目中通过浏览器完成了专用 Secret 的创建、列表显示、详情直达、元数据描述编辑、修改记录、元数据、事件页面访问和单项删除。详情页的数据值显示为固定掩码 `******`，没有在页面快照、命令输出、文档或测试报告中记录测试值。删除后通过 API 和页面刷新确认专用 Secret 及本轮生成的配置历史对象均已清理。

Secret 的 YAML 编辑入口和数据持久化本轮未提交，配置引用、低权限 RBAC 和完整跨 namespace 正反路径仍未完成。既有历史测试对象仍保留在专用 namespace，本轮未删除这些非本轮创建的对象。

### 页面和运行时限制

三个项目级页面均只显示当前路由项目 `v4-migration-e2e`，没有“全部项目”选择器；ConfigMap、Secret 的列表、详情和返回路由正常。浏览器控制台仍记录已知全局/扩展错误，当前页面错误计数约为 8 个错误和 2 个警告；页面仍能完成本轮目标流程，因此不能把本轮结论表述为“浏览器无错误”。

本轮只清理了本轮创建的 ConfigMap、Secret、ServiceAccount 及其配置历史对象，没有删除测试 namespace，也没有修改稳定分支或生产资源。

当前结论仍为：ConfigMap **部分通过，未验收**；Secret **脱敏和基础 CRUD 部分通过，未验收**。ConfigMap 的“编辑设置”数据持久化已验证；未完成项为 YAML 持久化、配置引用、低权限 RBAC 和完整 namespace 正反隔离。

## 2026-10-17 ConfigMap 数据编辑补充验证

本轮继续使用已部署制品 `05450c14f733a1c2e189270f2b257759dadacd8b`，通过真实 Playwright 会话在 `v4-migration-e2e` 项目创建专用对象 `v4-cm-yaml-20261017-1457`，并从详情页完成以下验证：

- 打开“编辑设置”，新增 `updated_key`，提交后详情页同时显示原有 `initial_key` 和新增键；
- 通过 Kubernetes API 复核对象仍在当前 namespace，数据键和值与页面一致；
- 浏览器刷新后两个数据键仍然显示，证明本次编辑结果没有只停留在前端缓存；
- 打开“修改记录”，页面显示 `#1` 记录，时间与提交操作一致；
- 通过详情页删除专用对象，API 复核 ConfigMap 为 NotFound；本轮生成的 `v4-cm-yaml-20261017-1457-history` Secret 也已清理。

本轮同时打开了“编辑 YAML”入口并确认编辑器可以显示当前对象。一次自动化键盘输入将编辑器自动缩进与输入文本中的缩进叠加，提交请求收到 HTTP 400；随后页面刷新恢复，Kubernetes 对象未被错误内容修改。这个过程不能作为 YAML 编辑器产品缺陷结论，也不能作为 YAML 持久化通过证据。YAML 编辑的有效粘贴、成功提交、刷新后持久化和错误提示仍需单独补测。

因此 ConfigMap 的“编辑设置”数据持久化调整为**通过**；“YAML 持久化”仍为**未验证**。配置引用、低权限 RBAC、跨 namespace 正反隔离和完整功能等价性仍未关闭，模块继续保持“VERIFY 部分通过，待补齐”。

## 2026-10-17 Secret 编辑设置脱敏修复复验

本轮针对上一轮发现的真实问题继续执行：Secret 详情页默认显示掩码，但旧实现打开“编辑设置”时会把已有 Secret 数据解码后回填到表单，导致明文暴露。该问题已停止继续扩大写操作，并按测试流程完成最小修复。

- 修复提交：`ba5a4518d`、`d6b4135fc`
- 修复范围：Secret 数据列表不再解码并展示原值；编辑设置表单以空值/掩码状态加载，使用密码输入控件；未修改字段提交时保留原有编码值，新输入值才进行编码；ConfigMap 原有明文编辑行为保持不变
- 单元测试：`./scripts/test.sh packages/console/src/pages/clusters/components/DataList/dataListUtils.test.ts`，58 个文件、230 个测试通过
- 相关 ESLint、`git diff --check`：通过；Node 22 下本地生产构建曾直接遇到 OpenSSL 环境错误，CI 构建作为制品构建依据
- GitHub Actions：Run `39046026262`；Unit tests 和 Build and publish 均成功
- 镜像 tag：`feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`
- 镜像 digest：`sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e`
- Deployment：`kubesphere-system/ks-console` generation/observedGeneration `512/512`，rollout 成功，副本、Ready、Available 均为 `1`
- Pod：`ks-console-7766585f4-7lz6x` Running/Ready；imageID 为 `ghcr.io/mysstack/ks-console@sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e`

在该新制品上使用真实登录浏览器，在专用 namespace 创建 `v4-secret-mask-20261017-1548`，详情页数据仍显示固定掩码 `******`。进入“更多操作 → 编辑设置”后，已有键显示为未填充状态，没有回显原 Secret 值；随后关闭弹窗并通过原生详情页删除对象。API 复核该 Secret 及本轮生成的历史 Secret 均为 NotFound。测试值没有写入文档、快照或报告。

该项修复已完成“代码 → CI 制品 → 131 rollout → 浏览器页面复验”闭环，Secret 的数据脱敏和编辑表单明文暴露问题可标记为**已验证修复**。Secret 模块仍不能标记为“已验收”，因为 YAML 持久化、配置引用、低权限 RBAC、完整 namespace 正反隔离和全部 V3 功能等价性仍未完成。浏览器控制台继续存在 `common is not defined`、`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 和 `ConfigConstants` 等既有全局/扩展错误；它们未阻止本轮 Secret 页面流程，但不应从模块验收中省略。

## 2026-10-18 ConfigMap YAML 与配置引用补充验收

本轮继续使用 131 当前部署制品 `feature-v4-configmaps-secrets-20261017-234040-d6b4135fc497`，代码基线为 `d6b4135fc`（当前分支随后仅新增文档提交 `b433e45ac`），镜像 digest 为 `sha256:ab81aca98c7c5e659bff196d90f53d531ab6f5b451d5daf1018fd0159b04263e`。Deployment `kubesphere-system/ks-console` 为 `512/512`，Pod `ks-console-7766585f4-7lz6x` 为 Running/Ready，Pod imageID 与该 digest 一致。

### ConfigMap YAML

- 在 `v4-migration-e2e` 中通过真实浏览器创建专用对象 `v4-cm-yaml-fix-20261018`。
- 从详情页进入“编辑 YAML”，通过 Ace 编辑器模型提交新增键 `yaml_key`；请求成功，Kubernetes API 返回对象同时包含原键和新增键。
- 浏览器刷新后详情页仍显示新增键；API 复核的 resourceVersion 已变化，证明结果已持久化，不是前端缓存。
- 上一轮 HTTP 400 的原因是自动化对 Ace 隐藏 textarea 使用 `fill`，导致旧 YAML 与新 YAML 拼接；此次改用编辑器实际模型复验成功，不能把前一次自动化输入失败当作产品缺陷。

### ConfigMap/Secret 配置引用

- 创建本轮专用 ConfigMap、Secret 和 Deployment `v4-ref-workload-20261018`；Deployment 同时包含 `envFrom`、ConfigMap volume 和只读 Secret volume 引用，并成功 rollout。
- 真实浏览器打开原生配置引用路由：`/test-workspace/clusters/host/projects/v4-migration-e2e/deployments/v4-ref-workload-20261018/config-reference`。
- 页面正确显示当前容器、ConfigMap/Secret 资源名称和各自产生的环境变量数量；点击 Secret“查看”只显示 `APP_TOKEN` 键名，不显示 Secret 值。
- 通过页面给 Secret 引用添加前缀 `REF_` 并点击“应用引用”，API 复核 Deployment 的 `secretRef` 保持正确资源名且写入 `prefix: REF_`；刷新配置引用页面后前缀仍保留，证明缓存刷新和持久化路径有效。
- 本轮没有在日志、快照、文档或命令输出中输出 Secret 值。

### 清理和未完成项

本轮创建的 ConfigMap、Secret、Deployment 及配置历史 Secret 均已按名称删除，并分别复核为 NotFound；`v4-migration-e2e` namespace 及既有资源未删除。

ConfigMap 的有效 YAML 和配置引用已取得部署后浏览器/API 证据；Secret 的配置引用已取得部署后浏览器/API 证据。三个模块仍不能标记为“已验收”，剩余缺口为低权限账号的正反 RBAC、完整跨 namespace 正反隔离、ServiceAccount 剩余可编辑字段和全部 V3 功能等价性。扩展运行时错误本轮按负责人指令暂不处理，继续单独登记，不影响本轮资源引用证据结论。

## 2026-10-18 低权限 RBAC 浏览器验收

本轮按负责人授权，在 131 测试集群创建临时 KubeSphere 用户 `v4-rbac-viewer-20261018`，只授予 `test-workspace` 查看企业空间角色和 `v4-migration-e2e` 项目 `viewer` 角色。密码通过受限临时文件传递，未写入仓库、日志、截图或文档；测试结束后用户、WorkspaceRoleBinding、项目 RoleBinding 和临时凭据文件均已删除。

在真实 Playwright 浏览器会话中完成登录，页面显示当前用户为该临时查看账号，未使用 admin 模拟低权限行为：

- ConfigMap 项目列表可读，只显示 `v4-migration-e2e` 当前 namespace 的对象；详情页可访问，页面没有创建、编辑或删除操作入口。
- Secret 项目列表可读，详情页数据值显示固定掩码 `******`，没有输出测试 Secret 值；页面没有创建、编辑或删除操作入口。
- ServiceAccount 项目列表可读，页面没有创建、角色修改或删除操作入口。
- 通过浏览器会话实际调用当前 namespace API：
  - ConfigMap：GET `200`；POST、PUT、DELETE 均为 `403`。
  - Secret：GET `200`；POST、PUT、DELETE 均为 `403`。
  - ServiceAccount：GET `200`；POST、PUT、DELETE 均为 `403`。
- 直接访问同一企业空间下的 `test-wes` 项目时，页面只加载 `test-wes` 的当前 namespace 数据，没有混入 `v4-migration-e2e` 数据；本轮没有修改 `test-wes` 或其他既有项目。

本轮专用 ConfigMap `v4-rbac-config-20261018` 和 Secret `v4-rbac-secret-20261018`、用户及绑定均已清理并复核；`v4-migration-e2e` namespace 保留。

该结果关闭了 ConfigMap、Secret、ServiceAccount 的低权限读写边界验证缺口，但不等于完整 RBAC 矩阵或模块验收完成。剩余项为完整跨 namespace 正反路径、ServiceAccount 剩余可编辑字段和全部 V3 功能等价性。扩展运行时错误继续按负责人指令暂不处理。

### 项目级账号补充结果

为区分“企业空间查看权限”和“项目查看权限”，又创建了临时账号 `v4-project-viewer-20261018`，只绑定 `v4-migration-e2e` 的项目 `viewer` RoleBinding，不绑定 `test-workspace` WorkspaceRoleBinding。该账号可以登录，但直接访问项目 ConfigMap 路由被前端返回 `/errors/403`；这说明当前 KubeSphere UI 要求账号先具备企业空间成员权限，单独的项目 RoleBinding 不能完成浏览器项目入口授权。

该账号及绑定已经清理。前一个带 `test-workspace` 查看角色的临时账号能够访问 `v4-migration-e2e` 和 `test-wes`，但每个项目页面只加载自身 namespace 的资源；因此本轮已验证页面请求的当前 namespace 范围和低权限读写边界，完整“仅授权项目可见”的企业空间成员模型仍需按项目负责人定义继续确认。

## 2026-10-18 Secret YAML 脱敏阻塞修复与部署后复验

本轮按“发现阻塞先统一处理，再继续测试”执行。上一轮在 131 浏览器打开 Secret 的“编辑 YAML”时发现真实缺陷：编辑器直接渲染 `_originData`，既显示 `data` 中的 Base64 值，也可能通过 `kubectl.kubernetes.io/last-applied-configuration` 注解间接显示同一数据。该问题属于产品数据暴露风险，立即停止继续写入并清理专用 Secret；不把它归为测试脚本问题。

### 修复范围

- `packages/shared/src/utils/secretYaml.ts` 新增 Secret YAML 编辑器的脱敏和提交合并逻辑：已有 `data` 值在编辑器中统一显示固定占位标记，移除可能包含原始数据的 `last-applied-configuration` 注解；用户明确替换的值仍按 Kubernetes Secret YAML 的 Base64 语义提交，未修改的占位标记会合并回原值。
- `useCommonActions.editYaml` 增加可选的 YAML 展示值和提交转换钩子，普通资源继续使用原行为。
- 同时修复集群配置入口和实际项目入口：`clusters/containers/Configuration/Secrets` 与 `projects/containers/Secrets` 的列表、详情“编辑 YAML”均使用脱敏路径。第一次修复只覆盖了集群配置入口，部署后复验发现项目路由仍使用旧实现，已由第二个提交补齐；这次漏测已记录为路由覆盖问题。

### 代码、制品和部署证据

- 修复提交：`cc36e3535`（通用脱敏逻辑、单元测试、集群入口）和 `cc8e9fc7e`（项目列表和详情入口）。远程分支已更新到 `cc8e9fc7e47bc08ea4e92d261fa21695d29a6226`。
- 本地回归：`./scripts/test.sh`，59 个文件、233 个测试通过；`git diff --check` 通过；变更文件 ESLint 无错误；`corepack yarn build:packages` 通过。
- GitHub Actions：Run `39094132849`，Unit tests 和 Build and publish 均成功。第一次使用短 SHA 作为 workflow `source_ref` 的构建因 checkout 无法解析短 SHA 失败，未部署该制品；随后使用分支触发，得到正确 tag。
- 最终镜像 tag：`feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b`。
- 最终镜像 manifest digest：`sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce`。
- 131 部署：`kubesphere-system/ks-console` generation/observedGeneration 为 `514/514`，rollout 成功；最终 Pod `ks-console-5cd7f8cdcd-4r5tv` 为 Running/Ready，Pod imageID 与上述 manifest digest 一致。旧 Pod 已退出，Deployment 保持 1 个副本。

### 真实浏览器复验

在已部署最终制品上用 Playwright 真实登录并直达项目 Secret 详情页，创建专用对象 `v4-secret-yaml-redact-20261018`，其 `data` 通过 `kubectl apply` 生成 `last-applied-configuration` 注解，以覆盖真实风险路径。复验结果如下：

- “编辑 YAML”编辑器只显示固定脱敏占位标记；原有两个测试值和 `last-applied-configuration` 均不出现在页面文本中。
- 在编辑器内明确替换两个键并增加一个键，点击“确定”后 Kubernetes API 的键集合为 `initial_key, updated_key, yaml_key`，三个值均按预期持久化；结果只用键名和布尔断言记录，没有输出值。
- 浏览器重新加载详情页后，新增键仍显示，Secret 数据区域仍显示 `******`；页面不显示 Base64 值。
- 专用 Secret 及本轮生成的历史 Secret 已删除，主对象 API 复核为 NotFound；`v4-migration-e2e` namespace 保留。

### 当前模块状态修正

Secret 的 YAML 数据暴露阻塞已完成“代码 → 单元测试 → CI 制品 → 131 rollout → 真实浏览器渲染、写入、刷新 → 清理”闭环，可标记为**已验证修复**；Secret 模块总体仍为“VERIFY 部分通过，待补齐”。尚未关闭的模块级项目包括完整配置引用回归、完整 namespace 正反隔离、全部 V3 功能等价性和其他错误态组合。浏览器仍记录既有全局/扩展错误；扩展运行时错误按负责人指令暂不处理，不能表述为浏览器无错误。

## 2026-10-18 项目 namespace 隔离、刷新返回和 NotFound 验证

本轮使用 131 当前最终制品 `feature-v4-configmaps-secrets-20261018-113604-cc8e9fc7e47b`，manifest digest 为 `sha256:79392342480fce277e0243ca5eef25f8c9b1983e1c7c9412e29ddcb3286bf3ce`；Deployment `kubesphere-system/ks-console` 为 `514/514`，Pod `ks-console-5cd7f8cdcd-4r5tv` 为 Running/Ready，Pod imageID 与该 digest 一致。使用真实浏览器登录，在 `v4-migration-e2e` 创建每个模块的唯一临时对象，测试完成后全部删除；没有修改 `test-wes` 或其他既有 namespace。

逐模块直达项目路由执行：列表 → 详情 → 刷新 → 浏览器返回 → `test-wes` 同类列表。三个模块结果均为：

| 模块           | 当前 namespace 对象可见 | 详情可见 | 刷新后仍可见 | 浏览器返回后仍可见 | `test-wes` 页面排除当前对象 |
| -------------- | ----------------------- | -------- | ------------ | ------------------ | --------------------------- |
| ConfigMap      | 通过                    | 通过     | 通过         | 通过               | 通过                        |
| Secret         | 通过                    | 通过     | 通过         | 通过               | 通过                        |
| ServiceAccount | 通过                    | 通过     | 通过         | 通过               | 通过                        |

另外对三个模块分别直达随机不存在对象的详情 URL，页面均显示 Kubernetes `NotFound ... not found`，没有把不存在对象渲染成已有对象或静默显示错误数据。

本轮关闭了三个模块的**项目级 namespace 正向展示、跨项目对象排除、刷新和浏览器返回路径**。这不等同于全部功能验收：完整 RBAC 组合、所有 V3 行为逐项对照、全部错误态组合仍需继续验证；扩展运行时错误按负责人指令暂不处理。

### 批量删除补充

在同一最终制品上，分别通过 ConfigMap 和 Secret 项目列表创建两个唯一临时对象，使用行选择框选择两个对象，打开原生“删除”确认框并输入对象名称确认。两次流程均返回对应列表，页面不再显示两个对象，Kubernetes API 复核两个对象均为 `NotFound`；测试 Secret 值未输出。临时对象已清理，namespace 保留。

该项关闭 ConfigMap、Secret 的原生批量删除路径证据；批量操作的低权限拒绝、网络失败和全部 V3 行为逐项对照仍按剩余矩阵继续验证。

## 2026-10-18 网络失败错误反馈修复与部署后复验

本轮在 namespace 路径验证中进一步注入资源列表 API 的网络失败，发现通用请求拦截器在没有 HTTP response 的情况下直接访问 `error.response.config.headers`，导致页面只显示空列表，用户看不到失败原因。

修复提交为 `8c6262d97`：请求错误处理增加无 response 的网络错误分支，生成 `Network Error` 全局提示，并保护可选的 response/config/headers 访问；新增 `request.test.ts` 覆盖网络错误和 HTTP 403 错误格式化。

验证链路：

- 本地 `./scripts/test.sh`：60 个测试文件、235 个测试通过。
- `corepack yarn build:packages`：通过；变更文件 ESLint 和 `git diff --check`：通过。
- GitHub Actions Run `39125068845`：Unit tests、Build and publish 均成功。
- 镜像 tag：`feature-v4-configmaps-secrets-20261018-195453-8c6262d97d13`。
- manifest digest：`sha256:bf6577ccdaddd314e478b4ba7235865e695a705c1f50cc7ec132152566b3652c`。
- 131 `ks-console` rollout 成功，Deployment generation/observedGeneration 为 `515/515`；Pod `ks-console-959cd4457-vxk5m` Running/Ready，imageID 与上述 digest 一致。
- 在该新制品上用真实 Playwright 登录，正常 ConfigMap 页面可渲染；随后只拦截当前 ConfigMap 列表 API，浏览器页面保持项目路由并显示 `Network Error`，没有再因为无 HTTP response 抛出前端异常。

该修复关闭了资源列表网络失败的错误提示缺口。API 失败时页面仍会显示空数据区域，同时显示错误提示；扩展初始化错误继续按负责人指令延期。真实集群断网或 API Server 故障未执行，本轮使用 Playwright 网络拦截进行确定性验证。
