# 全部业务 V3 Action 逐项等价性跟踪矩阵

> 核对日期：2026-10-18（上海时间）  
> 当前分支：`feature/v4-configmaps-secrets`  
> 取证范围：当前源码、`origin/release-3.4` 旧源码和 131 已部署制品  
> 说明：静态映射不等于运行时等价；只有入口、Network、权限、成功/取消/失败和刷新证据齐全才可关闭。

## 业务调用点

| 编号 | 当前调用文件                                                                                                 | Action                        | 旧源码证据                                       | V4 替代/当前状态                                                                                                                                                        | 运行时状态 |
| ---- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A01  | `projects/components/ConfigReference/entry.tsx`                                                              | `workload.template.edit`      | `src/actions/workload.js`                        | 已有原生 ConfigReference 编辑逻辑，但仍保留 V3 Action 兼容入口                                                                                                          | 未闭环     |
| A02  | 活动路由由 `projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/Deployments/Detail/routes.tsx`  | 历史 `workload.template.edit` | `src/actions/workload.js`                        | 当前活动详情使用原生 Workload Detail；旧 `projects/containers/Deployments/Detail/index.tsx` 仍是未从活动路由导入的兼容残留。原生字段、错误态、权限和全局预加载仍待验证  | 部分验证   |
| A03  | 活动路由由 `projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/StatefulSets/Detail/routes.tsx` | 历史 `workload.template.edit` | `src/actions/workload.js`                        | 当前活动详情使用原生 Workload Detail；旧 `projects/containers/StatefulSets/Detail/index.tsx` 仍是未从活动路由导入的兼容残留。原生字段、错误态、权限和全局预加载仍待验证 | 部分验证   |
| A04  | 活动路由由 `projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/DaemonSets/Detail/routes.tsx`   | 历史 `workload.template.edit` | `src/actions/workload.js`                        | 当前活动详情使用原生 Workload Detail；旧 `projects/containers/DaemonSets/Detail/index.tsx` 仍是未从活动路由导入的兼容残留。原生字段、错误态、权限和全局预加载仍待验证   | 部分验证   |
| A05  | `projects/.../Applications/.../OPAppTable/index.tsx`                                                         | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，`release-3.4` 未直接匹配 | 当前仍由 V3 Action 打开边缘应用模板创建                                                                                                                                 | 未验证     |
| A06  | `pages/workspaces/containers/Devops/index.tsx`                                                               | `devops.edit`                 | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 编辑流程                                                                                                                                 | 未验证     |
| A07  | `pages/workspaces/containers/Devops/index.tsx`                                                               | `devops.create`               | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 创建流程                                                                                                                                 | 未验证     |
| A08  | `core/.../ProfileMenu/index.tsx`                                                                             | `notification.user.setting`   | `release-3.4` 未直接匹配                         | 当前仍由 V3 Action 打开用户通知设置                                                                                                                                     | 未验证     |
| A09  | `shared/components/Apps/AppCreate/index.tsx`                                                                 | `app.template.create.v2`      | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 已在项目应用页打开“从应用模板”并完成远程模板选择；完整 V4 替代、失败/取消和低权限仍待验证                                                                               | 部分验证   |
| A10  | `shared/.../EdgeWorkloads/index.tsx`                                                                         | `workload.batch.delete.v2`    | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 执行边缘工作负载批量删除                                                                                                                             | 未验证     |
| A11  | `shared/components/Apps/AppsDeploySpaceModal/index.tsx`                                                      | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 已完成远程 Helm 模板选择、项目安装和 Application 创建；完整部署等价、失败/取消和低权限仍待验证                                                                          | 部分验证   |
| A12  | `shared/components/Modals/AppTemplateEdit/index.tsx`                                                         | `openpitrix.template.edit.v2` | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 编辑表单、字段回填、保存、删除和上传成功子路径已有运行时证据；冲突/失败、低权限和 V3 Action 移除仍未闭环                                                                | 部分验证   |

A02～A04 和 A01 共涉及三类工作负载详情与配置引用；A05～A12 是独立业务入口。桥接实现和导出文件不重复计数，但删除桥接前必须关闭所有业务调用点。

## 已完成和未完成的边界

- ConfigMap、Secret、ServiceAccount 资源本身的 V3 Action 等价性已单独记录在[资源模块等价性记录](./v3-equivalence-config-secrets-131-20261018.md)。
- A02～A04 的活动项目详情路由已切换到 `ApplicationWorkloads/Workloads/*/Detail` 原生实现，当前活动路由文件不再依赖 `useV3action`/`WujieReact`；“编辑设置”复用原生 YAML 编辑器。旧 `projects/containers/{Deployments,StatefulSets,DaemonSets}/Detail` 文件仍存在，但当前 `routes/detail.tsx` 没有导入它们，删除前仍需完成全仓库路由和联邦引用复核。完整字段、成功/失败/取消和权限等价仍未关闭，应用启动层仍会预加载 `/consolev3/dashboard`。
- A05～A12 目前只有静态调用、旧制品字符串或部分 V4 Store 证据，没有完整的 131 触发入口、Network、RBAC、失败和取消路径证据。
- 扩展初始化错误按负责人指令延期；延期不等同于这些 Action 已等价。
- 真实 API Server 故障验证另行记录，不能用 Playwright 路由拦截冒充集群故障。

## 下一步关闭条件

按 A01～A12 顺序逐项补齐：当前路由和入口、旧 V3 Store/API/权限、131 触发后的 Network、成功/取消/失败反馈、刷新/返回、V4 原生替代和低权限拒绝路径。每个 Action 关闭前不得删除对应 V3/Wujie 桥接代码。

## 2026-10-19 静态调用覆盖复核

重新扫描当前源码（排除 `packages/**/lib` 编译输出和 `node_modules`）后，`useV3action/useV3Actions` 命中 14 个文件：11 个业务调用文件，以及 `v3actions.tsx`、`hooks/index.ts`、`hooks/useV3Actions/index.tsx` 3 个桥接/导出文件。11 个业务文件对应 A01～A12 共 12 行，只有 DevOps 文件拆成 `devops.edit` 和 `devops.create` 两个独立 Action。当前矩阵没有发现未登记的业务 `useV3action` 调用点；静态覆盖完整不等于运行时等价通过。

## 2026-10-18 Deployment 详情运行时补充

在 `v4-migration-e2e` 创建唯一临时 Deployment `v4-v3-workload-20261018`（副本数为 0，不启动业务 Pod），使用临时项目 admin 账号从真实浏览器登录并打开项目 Deployment 详情。页面实际请求了当前 V4 Deployment API，同时观测到 `/consolev3/dashboard` 请求；浏览器页面仍有已知运行时错误，未把该入口当作 V4 等价通过。

该证据确认 A02 的项目 Deployment 详情仍与 V3/Wujie 兼容路径耦合，不能关闭 `workload.template.edit` 等价性。临时 Deployment、账号和 IAM 绑定已经清理。

## 2026-10-18 DevOps、通知和应用入口补充

- 真实浏览器打开 `/workspaces/test-workspace/devops`，页面请求了企业空间集群列表，但当前 `test-workspace` 没有可供 DevOps 页面选择的集群，页面停留在“请选择集群”，没有创建入口。因此 `devops.create`、`devops.edit` 不能伪造为已验证；当前环境缺少 DevOps fixture。
- 真实浏览器打开项目 `/applications/template` 和 `/applications/edge`，原生应用列表、创建入口和“从应用模板创建”抽屉均可渲染；当前测试项目没有应用模板数据，无法触发 `app.template.create.v2`、`openpitrix.template.edit.v2` 或边缘应用部署链路。该范围保持未验证。
- 真实浏览器用户菜单没有出现通知设置入口，当前启用模块未提供 `notification.user.setting` 的可触发入口；该 Action 保持未验证。

上述结果是环境/fixture 证据缺口，不是等价通过。需要相应的 DevOps、应用模板和通知模块测试数据或负责人确认功能未启用后，才能继续关闭这些 Action。

## 2026-10-18 应用模板详情和版本列表补测

本轮先在已部署的旧制品上直接访问 `/workspaces/test-workspace/apps/stakater-configmap`，发现路由返回原生 `Not Found`。源码核对确认两个问题：工作区路由没有挂载 `appTemplateDetailRoutes`，详情路由参数定义为 `appId`，而详情组件和实际链接使用 `appName`。已在提交 `b3e7571b4bddd812dd65fa67ea3741a48c14ef9c` 修复并部署验证。

随后发现详情页的 `VersionListDetail` 仍返回空 Fragment，导致版本区域没有任何列表、上传入口或版本操作。已在提交 `57f297f90f40136f57ba1fdd40c1417b17839abd` 恢复原生 `VersionList`，并增加回归测试；该提交已通过 GitHub Actions Run `39132471323`，镜像 tag 为 `feature-v4-configmaps-secrets-20261018-214008-57f297f90f40`。

在 131 的该制品上完成真实浏览器验证：

- Deployment rollout 成功，Pod `ks-console-58975f9479-vpx2b` 为 `Running/Ready`；部署 tag 与分支、上海时间和短 SHA 一致，Pod imageID 为 `sha256:3e299d0217e60ab90258830bc21cce12e61fbafc2f075792cbb3658c0e28bc62`，镜像多架构 index digest 为 `sha256:24a0b0ed8d1b51afdaac381df715fc82529b342fb621b22a844aef2af0865041`。
- 直达 `/workspaces/test-workspace/apps/stakater-configmap` 自动进入 `versions`，详情 API 返回 200；版本 API 返回 200，页面渲染 3 个版本（1.0.5、1.0.2、1.0.1），总数显示为 3。
- 点击版本项可以展开 Chart Files、Version Information、Deployment 和 View in Store 操作；点击 Upload Version 可以打开原生上传弹窗，点击 Cancel 后弹窗关闭且未产生写操作。
- 同一浏览器会话仍观测到 `/consolev3/dashboard` 预加载和已登记的扩展初始化错误；这些错误按负责人指令延期处理，不能据此把全局 V4 迁移标记为完成。

本轮只关闭了 A12 的“详情路由和版本列表不可渲染”子缺口。A12 的编辑保存、删除、上传成功、错误/取消完整路径及 V3 Action 移除仍未闭环；此前真实浏览器点击详情页 Edit 出现的页面空白已由后续制品修复并完成表单渲染复验，但不能扩大为编辑写入等价通过。A09 的项目“从应用模板创建”仍因抽屉没有可用模板数据而未验证。A01～A11 和 A12 均不能标记为全量等价通过。

## 2026-10-18 应用模板编辑表单补测

在 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b` 制品上，真实浏览器直达应用模板版本页并打开编辑弹窗。名称、描述、分类、图标和服务商网站均从 V2 应用详情正确回填；点击“取消”后弹窗关闭且未产生写请求。该证据关闭 A12 的表单渲染、字段回填和取消子路径。

本次没有提交编辑保存、删除或上传成功操作，因此 A12 的写入成功、失败反馈、刷新一致性及 V3 Action 移除仍为未验证；A09、A10、A11 以及 A06～A08 仍分别受 fixture 或 V3/Wujie 边界影响，保持未验证。

## 2026-10-19 A01 ConfigReference 运行时补测

在当前 131 制品 `feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b` 上，创建专用 Deployment `v4-config-reference-20261019`、ConfigMap 和 Secret 后，使用真实浏览器访问项目工作负载 ConfigReference 路由。页面正确渲染容器、ConfigMap/Secret 引用、键数量和“应用引用”入口；请求取得工作负载、ConfigMap 和 Secret 的 `200` 响应，页面只显示 Secret 资源名、前缀和键名，不显示 Secret 值。

浏览器为两个临时引用分别写入前缀 `CM_` 和 `SEC_`，点击“应用引用”后通过 Kubernetes API 复核两个 `envFrom` 引用的前缀已持久化；随后清空前缀再次应用，API 复核前缀已移除。专用 Deployment、ConfigMap 和 Secret 已清理。该证据关闭 A01 的入口、引用展示、前缀写入、清除和 API 持久化子路径。

A01 仍不能标记为完整 V3 等价：主工作负载模板编辑仍保留 V3/Wujie 兼容入口，低权限拒绝、网络失败、错误反馈和所有工作负载类型的逐项组合尚未全部完成。

## 2026-10-19 A03/A04 StatefulSet、DaemonSet ConfigReference 补测

使用当前 131 制品和真实浏览器，在 `v4-migration-e2e` 分别创建副本数为 0 的专用 StatefulSet、不会调度 Pod 的专用 DaemonSet，以及临时 ConfigMap/Secret。直达两个工作负载的 ConfigReference 路由后，页面均正确显示工作负载名称、容器、ConfigMap/Secret 引用、键名和“应用引用”入口；两个工作负载详情 API、引用资源 API 均返回 `200`。

两个页面均观测到 `/consolev3/dashboard` 请求，说明当前工作负载详情仍加载 V3/Wujie 兼容壳；因此 A03、A04 的 ConfigReference 子路径可以确认可访问，但工作负载详情的 V4 原生等价性不能关闭。专用 StatefulSet、DaemonSet、ConfigMap 和 Secret 已清理。

## 2026-10-19 A05/A09/A11 应用入口补测

使用当前 131 制品和真实浏览器访问项目 `/applications/template`、`/applications/edge`。两条入口均返回 `200`，原生应用列表和“创建应用”弹窗正常渲染；从“从应用模板”进入后，应用模板弹窗正常打开，但当前企业空间显示“未发现资源”，应用列表总数为 `0`，没有可触发模板选择、边缘应用创建或部署空间提交的 fixture。

本轮确认了 A09 的入口、弹窗和空数据态，并确认 A05/A11 的业务入口仍由 `useV3action`/`consolev3` 兼容路径承载；没有把空数据态当成成功等价。此前的空数据态记录由下方远程模板补测更新，A05 仍未验证，A09/A11 转为部分验证。

## 2026-10-19 A09/A11 远程模板创建和项目安装补测

为关闭此前“项目没有可用模板 fixture”的环境缺口，在 `test-workspace` 使用专用临时账号登录 131，进入项目 `v4-migration-e2e` 的应用页面，实际选择远程仓库 `stakater` 的 `configmap` 模板并打开原生安装流程。

- 本轮使用部署制品 `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，manifest digest 为 `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`；Pod `ks-console-57fcd4d59f-sn5cp` 为 `Running/Ready`，实际 imageID 与该 digest 一致。
- “从应用模板”弹窗、远程仓库选择、模板详情和版本选择均正常渲染。
- 输入唯一测试名称 `v4-app-template-20261019` 后完成应用设置并点击“安装”；浏览器捕获 Application 创建 `POST 200`，应用列表随后显示该对象为“已创建”，刷新后显示为“运行中”。
- 创建后的项目应用详情、资源状态、应用模板和应用设置三个原生子页面均可渲染；详情 API、版本 API 和应用设置页面请求均返回 `200`。
- 首次打开详情页时，测试账号对系统网关 API 的 `403` 被全局错误处理跳转到 `/errors/403`。临时补充集群管理员绑定后重新登录，详情页才可访问。该权限只用于定位页面验收条件，已在测试后删除；因此本轮不能作为低权限通过。
- 本轮临时 Application、相关版本、测试用户、WorkspaceRoleBinding、项目 RoleBinding 和临时集群绑定均已删除；`v4-migration-e2e` namespace 保留。

本轮为 A09 的入口、模板选择和 A11 的项目安装/创建增加了真实成功证据，因此二者调整为“部分验证”。失败、取消、删除、刷新返回、低权限正反路径、完整 V4 原生替代以及 V3/Wujie 启动层预加载仍未闭环；A05 边缘应用仍因缺少 Edge fixture 保持未验证。

## 2026-10-19 A12 Helm 版本上传缺口修复与部署复验

在真实浏览器验证应用模板版本上传时，先发现验证接口能够返回应用名和版本号，但提交请求没有保留验证结果中的 `name`/`versionName`，页面信息显示为 `-`，提交链路因此无法形成有效的 ApplicationVersion 请求。随后补充回归测试并修复上传数据组装：

- 提交 `0fff169bd`：按 `CREATE_APP`/`ADD_VERSION` 分支保留验证返回的应用名、版本名，并让上传信息页显示 `appName`/`versionName`。
- 提交 `58de31e58`：版本上传请求补充后端要求的 `appType: helm`。
- 本地验证：上传数据回归测试 2/2、目标文件 ESLint、Prettier 和 `git diff --check` 通过；此前完整本地测试为 67 个测试文件、246 个测试通过，`corepack yarn build:packages` 通过。
- CI：Run `39209219839` 成功；镜像 tag 为 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`，manifest digest 为 `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`。
- 131：Deployment `ks-console` rollout 成功，generation/observedGeneration 为 `523/523`，Pod `ks-console-6dcf5456c4-7tvhx` 为 `Running/Ready`，实际 imageID 为 `ghcr.io/mysstack/ks-console@sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`，`/readyz` 通过。

部署后浏览器已重新验证版本上传入口、Chart 校验请求 `200`、版本元数据显示路径以及页面刷新路径；同时用同一部署制品复核了版本创建 API 的正确请求形态。由于本轮自动化提交结果未取得可独立引用的最终 HTTP `200` 响应和完整成功截图，A12 不能因代码和 CI 通过而标记上传成功；上传成功、冲突/失败反馈、低权限和 V3 Action 移除继续保持未闭环。临时 Application、ApplicationVersion、账号、绑定和上传文件已清理，`v4-migration-e2e` namespace 保留。

## 2026-10-19 A06/A07/A08 DevOps 与通知入口补测

真实浏览器访问 `/workspaces/test-workspace/devops` 返回 `200`，企业空间集群列表请求成功但没有可选集群；页面显示“请选择集群”、空列表和“创建”入口，无法触发 `devops.create` 或 `devops.edit`。打开用户菜单后实际显示用户设置、登出、关于和技术支持，没有“通知设置”入口，因此 `notification.user.setting` 没有可触发 fixture。

本轮只确认了 A06/A07 的环境条件缺口和 A08 当前入口未启用，没有把空列表或隐藏入口标记为等价通过。三个 Action 的成功、失败、取消、刷新、RBAC 和 V4 原生替代仍未验证。

## 2026-10-19 A02 Deployment 详情补测

在 `v4-migration-e2e` 创建副本数为 0 的专用 Deployment `v4-deployment-20261019`，真实浏览器直达项目 Deployment 详情。页面进入 `resource-status`，显示编辑信息、更多操作、编辑设置和编辑 YAML；详情 API 返回 `200`，点击“编辑信息”可打开原生信息弹窗，未提交写操作。页面同时实际请求 `/consolev3/dashboard`，并加载 V3 资源桥接，因此 A02 的工作负载模板编辑仍不是完整 V4 原生等价。专用 Deployment 已清理。

## 2026-10-19 A10 边缘工作负载入口核对

只读检查当前集群的 CRD 和 API Resource，没有发现 Edge/EdgeWorkload 相关资源；项目应用入口也没有可用边缘应用 fixture。因此无法触发 `workload.batch.delete.v2` 的选择、确认、成功、失败或取消路径，A10 保持未验证。

## 2026-10-19 A12 应用模板编辑保存补测

为验证真实写入路径，在 `test-workspace` 临时创建 Application `v4-app-template-20261019` 和 ApplicationVersion `v4-app-template-20261019-1.0.0`，通过当前 131 已部署制品直达应用模板版本页并打开原生“编辑”弹窗。

- 编辑弹窗正确回填名称、描述、分类、图标和服务商网站；修改描述后点击“确定”，浏览器捕获应用详情 `PATCH 200`。
- 返回版本页并刷新后，修改后的描述仍可见，说明编辑提交和页面刷新后的数据读取一致。
- 打开“更多操作 → 删除”后，删除确认框能够渲染并要求输入应用模板名称；输入名称后点击“确认”，浏览器捕获应用详情 `DELETE 200`，页面返回工作区应用模板列表。
- 重新创建同名临时对象后打开删除确认框，点击“取消”关闭弹窗，未产生 `DELETE` 请求，路由仍停留在版本页。
- Application 删除后 ApplicationVersion 未由该临时对象自动清理，随后通过 Kubernetes API 单独删除 ApplicationVersion，并逐项确认两个对象均为 `NotFound`；没有保留测试对象。

本轮关闭 A12 的编辑保存、刷新一致性、删除成功和删除取消子路径，将 A12 保持为“部分验证”。A12 的删除失败、版本上传成功/失败、低权限路径和 V3 Action 移除仍未闭环；A09、A11 仍因缺少可用应用模板 fixture 未验证。

## 2026-10-19 A02/A03/A04 原生详情切换与部署后复验

提交 `3a14e96f1` 将项目 Deployment、StatefulSet、DaemonSet 详情路由切换到已有原生 Workload Detail 实现，并把原 `workload.template.edit` 的“编辑设置”入口改为原生 YAML 编辑器；没有修改 `release-4.1.5`，也没有删除其他仍被联邦或旧入口使用的组件。

本轮通过 GitHub Actions Run `39197149133` 构建并推送镜像，镜像 tag 为 `feature-v4-configmaps-secrets-20261019-115905-3a14e96f10b5`，manifest digest 为 `sha256:e61af451d3425e60445cd097549cb6a1e53e4fc511f4a14fad3388c3e03155fd`。131 rollout 后 Deployment 为 `521/521`，Pod `ks-console-57fcd4d59f-sn5cp` 为 `Running/Ready`，实际 imageID 与上述 digest 一致。

真实浏览器分别访问以下原生详情路径，并创建了副本数为 0 或不可调度的临时测试工作负载：

- Deployment：详情资源状态页渲染，工作负载 API 返回 `200`，没有 `wujie-app` 元素；
- StatefulSet：详情资源状态页渲染，详情 API 返回 `200`，没有 `wujie-app` 元素；
- DaemonSet：详情资源状态页渲染，详情 API 返回 `200`，没有 `wujie-app` 元素；
- 三个页面均可打开原生“编辑设置”入口，未提交写操作。

浏览器请求仍观测到应用启动层的 `/consolev3/dashboard` 全局预加载，因此本轮只能关闭“这三个项目详情组件直接嵌入 V3/Wujie”的代码路径，不能宣称完整 V3 等价或全局 V3/Wujie 已移除。完整模板字段、编辑成功/失败/取消、低权限、刷新/返回和启动层预加载仍未闭环。临时 Deployment、StatefulSet、DaemonSet 已清理。

## 2026-10-19 当前制品业务入口复核

在当前 131 制品 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`（manifest digest `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`）上，用真实浏览器重新核对尚未闭环的入口：

- A06/A07：`/workspaces/test-workspace/devops` 页面正常渲染，页面显示“请选择集群”、总数为 0，并有“创建”按钮；点击后没有形成可用创建弹窗，当前企业空间没有可供 DevOps 选择的集群。`devops.create`、`devops.edit` 的成功、失败、取消、刷新和权限路径仍未验证。
- A09：项目应用页的“创建 → 从应用模板”弹窗及应用模板抽屉均可打开；抽屉返回“未发现资源”，没有可选择模板，未执行创建写操作。
- A12：应用模板版本页的“上传版本”弹窗可以打开；本轮点击“取消”关闭弹窗，未产生上传写请求。上传成功、冲突/失败反馈和低权限路径仍未闭环。
- A08：打开用户菜单后实际菜单只有“用户设置、登出、关于、技术支持”，没有“通知设置”入口；`notification.user.setting` 当前无可触发 fixture。
- A05：当前环境仍没有 Edge/EdgeWorkload API、CRD 或可用边缘应用 fixture，无法触发批量删除入口。

本轮只补充了入口渲染、空数据态和取消路径证据，没有把缺少 fixture、隐藏入口或弹窗打开当作 V3 功能等价通过。临时 Application `v4-app-template-20261019`、对应 ApplicationVersion 和 Helm 安装 Job 已按测试名称清理并复核不存在；`v4-migration-e2e` namespace 保留。

## 2026-10-19 A12 Helm 版本上传成功补测

在当前 131 制品 `feature-v4-configmaps-secrets-20261019-142018-58de31e58395`（manifest digest `sha256:772adef318c923e4452b9b1b5fcc8e654006b6439938d2815cc138dae36e8d17`）上，使用真实浏览器向现有 `stakater-configmap` 应用模板上传专用 Chart `v4-action-upload-20261019.tgz`，Chart 版本为 `9.9.19`。

- 浏览器上传并完成 Chart 校验，校验请求 `POST .../versions?validate=true` 返回 `200`。
- 点击“确定”后，版本创建请求 `POST .../apps/stakater-configmap/versions` 返回 `200`；响应中的应用名为 `stakater-configmap`、版本名为 `9.9.19`。
- 刷新版本列表后页面显示 `9.9.19`，状态为“未提交”，总版本数从 3 变为 4。
- 通过 Kubernetes API 删除专用 `ApplicationVersion` `stakater-configmap-9.9.19`；刷新后页面恢复总数 3，并确认资源不存在。临时 Chart 文件和浏览器产物已清理。

该证据关闭 A12 的上传成功子路径。A12 仍为“部分验证”：冲突/失败反馈、低权限拒绝、完整刷新/返回边界和 `openpitrix.template.edit.v2` 的 V3 Action 移除仍未完成。

## 2026-10-19 A12 上传失败反馈修复与部署后复验

本轮继续验证 A12 的失败反馈子路径。前一轮只修改本地 `PackageUpload` 组件后，真实浏览器仍由远程 `openpitrix` 扩展包承载版本页，因此无效 Chart 的校验请求返回 `500` 后页面会长期停留在“正在上传”。通过浏览器请求和已部署资源核对确认，实际入口加载的是 `/pstatic/dist/openpitrix/index.js`，不在当前仓库内；问题根因是共享请求层把该预期的 Chart 校验失败继续作为 rejected Promise 返回，远程扩展没有进入错误态。

本轮在 `packages/shared/src/utils/request.ts` 增加了仅匹配 `application.kubesphere.io/v2/.../versions?validate=true` 的错误响应归一化，将校验错误转换为 `{ error: 'UPLOAD_AGAIN_TIP' }`，并补充请求工具回归测试。该修复不改变未授权响应的跳转逻辑，也不把其他接口的 `500` 当作校验失败处理。

| 检查项       | 实际结果                                                                                                                                                | 状态   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Git 提交     | `6acdc3b2fc52a3264ee58a2bb9270cd630e7dc44`，已推送到 `feature/v4-configmaps-secrets`                                                                    | 已验证 |
| 本地单元测试 | `./scripts/test.sh`：68 个测试文件、248 个测试通过                                                                                                      | 已验证 |
| 本地构建     | `corepack yarn build:packages` 成功                                                                                                                     | 已验证 |
| CI           | Run `39267930049`，Unit tests 与镜像构建均成功                                                                                                          | 已验证 |
| 镜像         | `feature-v4-configmaps-secrets-20261019-222044-6acdc3b2fc52`；manifest digest `sha256:99ca60b78572916ad45342fcc752e7966a8bd6fb57e4db5108acfc6a6e996b20` | 已验证 |
| 131 部署     | Pod `ks-console-7f96d678f-7k64b` 为 `Running/Ready`，实际 imageID 与上述 digest 一致                                                                    | 已验证 |
| 无效 Chart   | 校验请求仍返回 `500`，页面从“正在上传”进入“出现错误，请重试”，确定按钮保持禁用                                                                          | 已验证 |
| 有效 Chart   | Chart `v4-action-upload-20261019.tgz`、版本 `9.9.20` 校验成功，页面显示应用信息并完成版本创建；专用 `ApplicationVersion` 已删除并复核不存在             | 已验证 |
| 浏览器页面   | 版本页正常渲染，刷新后原有版本总数恢复为 3                                                                                                              | 已验证 |

本轮关闭 A12 的无效 Chart 错误反馈和有效上传提交子路径。A12 仍只能标记为“部分验证”：冲突边界、低权限拒绝、完整返回路径和 `openpitrix.template.edit.v2` 的 V3 Action 移除仍未完成。页面仍有已登记的扩展运行时错误，按负责人指令暂不处理；该错误不能作为本轮上传修复已解决的证据。

## 2026-10-20 DevOps Action 作用域补测

本轮使用真实浏览器分别以 `dev-workspace` viewer 和平台管理员访问 `/workspaces/dev-workspace/devops`。两种账号均看到 DevOps 页面和“创建”入口，但集群选择器中的 `host` 明确显示“未安装 DevOps”。

- viewer：`GET /kapis/devops.kubesphere.io/v1alpha3/workspaces/dev-workspace/namespaces` 返回 `404`，创建请求返回 `403`；创建弹窗可以打开，取消后没有写入。
- platform-admin：同一 DevOps 列表 GET 返回 `404`，创建请求也返回 `404`；创建弹窗可以打开，集群选项显示“未安装 DevOps”，取消后没有写入。

这组结果区分了权限拒绝和后端能力缺失：viewer 的 `403` 是权限边界，管理员的 `404` 证明当前环境没有可用 DevOps API/扩展。A06 `devops.edit` 和 A07 `devops.create` 仍为“未验证/环境阻塞”，不能把入口渲染或空列表当作 V4 等价完成。

## 2026-10-20 联邦项目与 Edge 入口运行时补测

本轮使用真实 Playwright 以平台管理员访问当前 131 环境，补充 A05/A10 相关入口的运行时边界证据：

- 联邦项目路由 `/workspaces/test-workspace/federatedprojects` 正常渲染，列表为空；创建弹窗能够打开，`host` 显示为主集群，但添加集群按钮为禁用状态。本轮未提交表单，因此没有形成 FederatedProject fixture。
- 联邦页面请求工作空间 namespace 列表并返回 `200`，同时实际请求 `/consolev3/dashboard` 和 `dist/v3dist/*` 资源；这证明当前入口仍处于兼容加载边界，不能作为 V4 原生等价证据。
- Edge 节点路由 `/clusters/host/edgenodes` 正常渲染空数据态；边缘节点列表请求带 `node-role.kubernetes.io/edge` 标签选择器并返回 `200`，当前没有 Edge 节点。
- 当前集群 API/CRD 盘点没有发现可用于 A05/A10 的 KubeSphere Edge 或 FederatedProject/FederatedResource 资源，因此无法触发边缘应用创建、边缘批量删除或联邦资源 CRUD。

A05、A10 继续保持“环境不可执行/未验证”，不能用路由可达、空列表、禁用按钮或兼容资源加载替代成功、失败、取消、权限、刷新和 V4 替代行为验证。

## 2026-10-20 活动路由与动态 Action 重新核对

重新以当前分支源码为准核对 `packages/console/src/pages/projects/routes/detail.tsx` 和非测试源码中的 `useV3action/useV3Actions`：

- 活动路由明确导入 `ApplicationWorkloads/Workloads/Deployments/Detail/routes.tsx`、`StatefulSets/Detail/routes.tsx` 和 `DaemonSets/Detail/routes.tsx`，对应活动详情实现使用原生 Store、原生详情页和原生编辑操作。
- 当前非测试源码中 `useV3action/useV3Actions` 命中 11 个文件：8 个业务调用文件、2 个桥接实现/Hook 文件和 1 个导出文件；对应 9 个活动业务 Action 行（DevOps 拆成 create/edit）。A02～A04 不再属于当前活动动态 Action 调用点。
- 旧 `projects/containers/{Deployments,StatefulSets,DaemonSets}/Detail/index.tsx` 仍包含 `WujieReact`，但没有被当前项目详情路由导入；它们属于待清理的兼容残留，不能直接删除，必须先完成其他路由、测试和联邦消费者复核。

该核对修正了“历史调用点数量”和“当前活动调用点数量”的混用。它只关闭了 A02～A04 的活动路由归属证据，不代表完整 Workload 功能等价、全局 V3/Wujie 移除或兼容残留清理已经完成。

## 2026-10-20 原生 Workload HPA 请求修复

在 A02～A04 的原生详情页浏览器复验中发现，集群版本信息未加载时 HPA 默认版本带有 `apis/` 前缀，调用方再次拼接后形成 `/apis/apis/autoscaling/v2beta2/...`。该错误在控制台日志中重复出现并造成网络资源耗尽，已由 `getHpaApiVersion` 统一规范，新增回归测试并通过本地完整测试和构建。

第一版路径修复部署后，浏览器确认重复 `/apis/apis/` 已消失，但正确 HPA URL 仍被重复请求并触发资源耗尽。进一步定位到 `useCacheStore` setter 身份不稳定导致详情同步 effect 循环；第二版 `useCallback` 修复已提交为 `3ee15af9ad2b`，CI Run `39302192970` 成功并部署到 131。真实浏览器复验 Deployment、StatefulSet、DaemonSet 页面时，重复 HPA 请求和 `ERR_INSUFFICIENT_RESOURCES` 均为 0，DaemonSet 的操作菜单、原生 YAML 弹窗和取消路径可用。

该证据关闭 A02～A04 的 HPA 请求路径和详情同步循环缺陷，但 A02～A04 的完整字段、成功/失败/取消、低权限、刷新返回、V3 Action 移除和全局兼容残留清理仍未闭环。

## 2026-10-20 A02～A04 原生详情操作补测

在第二版制品 `feature-v4-configmaps-secrets-20261020-022516-3ee15af9ad2b` 上，使用真实浏览器和 `v4-migration-e2e` 内的临时 Deployment、StatefulSet、DaemonSet 复核原生详情页：

- 三类详情页均能直达并渲染资源状态、修改记录、元数据、环境变量、配置引用和事件路由，页面显示项目和工作负载名称，副本为 `0/0` 或不可调度的 `0/0`。
- 三类页面均能打开“编辑信息”弹窗；StatefulSet、DaemonSet 完成取消路径，Deployment 完成描述 `v4-a02-verify` 的提交，页面和 Kubernetes API 均显示该描述。
- Deployment 完成刷新和浏览器返回后路由、描述和页面数据保持一致；DaemonSet 的“更多操作”菜单、原生“编辑 YAML”弹窗及取消路径已在同一制品上复核。
- 三类页面的 HPA 重复请求为 0，`ERR_INSUFFICIENT_RESOURCES` 为 0；测试资源已删除，namespace 清理后只剩系统 ConfigMap 和默认 ServiceAccount。

本轮只关闭了 A02～A04 的原生详情渲染、部分信息编辑、取消、刷新/返回和 HPA 请求稳定性子路径。完整 YAML 持久化、所有可编辑字段、成功/失败/取消组合、低权限、回滚/重新创建/删除、V3 Action 移除和 `/consolev3/dashboard` 全局预加载仍未闭环，因此 A02～A04 继续为“部分验证”。

本轮另建临时 Deployment 尝试通过原生“编辑 YAML”提交描述变更。浏览器编辑器自动化输入后提交返回 HTTP `400`，弹窗保持打开；由于当前输入方式只更新了编辑器活动文本区域，未形成可独立引用的有效 YAML 提交证据，不能把这次失败归因于原生 API 或代码缺陷。该临时 Deployment 已删除，YAML 持久化继续标记为未验证，后续需要使用编辑器支持的逐键输入或文件导入方式重新验证。

## 2026-10-20 A02 Deployment 原生 YAML 持久化补测

在当前 131 制品 `feature-v4-configmaps-secrets-20261020-022516-3ee15af9ad2b` 上，使用真实 Playwright 登录并访问 `v4-migration-e2e` 中的临时 Deployment `v4-yaml-verify-20261020-2`。本轮通过“编辑 YAML”对话框的文件导入入口提交合法 `Deployment` YAML，将 `kubesphere.io/description` 从 `yaml-before` 修改为 `yaml-after`。

- 点击确定后对话框关闭，详情页立即显示 `yaml-after`。
- 浏览器刷新后仍显示 `yaml-after`，资源详情路由和页面数据正常渲染。
- Kubernetes API 回读对象注解为 `yaml-after`，generation 从 `1` 变为 `2`。
- 本轮临时 Deployment 已删除，复核 `v4-migration-e2e` 只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。

该证据关闭 A02 的合法 YAML 文件导入、提交、页面刷新和 API 持久化子路径。A03/A04 尚未分别取得 YAML 持久化证据；非法 YAML、resourceVersion 冲突、成功/失败/取消完整组合、低权限、回滚/重新创建/删除、V3 Action 移除和 `/consolev3/dashboard` 全局预加载仍未闭环，A02～A04 继续标记为“部分验证”。

## 2026-10-20 A03/A04 StatefulSet、DaemonSet 原生 YAML 持久化补测

在同一 131 制品上，使用真实 Playwright 对 `v4-migration-e2e` 中临时 StatefulSet `v4-yaml-statefulset-20261020` 和 DaemonSet `v4-yaml-daemonset-20261020` 的原生详情页执行 YAML 文件导入：分别将 `kubesphere.io/description` 从 `yaml-before` 更新为 `yaml-after-sts`、`yaml-after-ds`。

- 两个“编辑 YAML”入口均可打开，合法 YAML 文件导入后点击确定，详情页分别显示新的描述。
- 两个页面刷新后仍显示对应的新描述，路由和详情数据正常渲染。
- Kubernetes API 回读两个对象的描述注解均与页面一致；两个测试对象均已清理。
- 清理后 `v4-migration-e2e` 只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。

该证据关闭 A03/A04 的合法 YAML 文件导入、提交、刷新和 API 持久化子路径。非法 YAML、resourceVersion 冲突、所有操作成功/失败/取消、低权限、回滚/重新创建/删除、V3 Action 移除和 `/consolev3/dashboard` 全局预加载仍未闭环，A02～A04 继续标记为“部分验证”。

## 2026-10-20 A02/A03/A04 Workload 低权限拒绝补测

使用当前 131 制品和真实 Playwright，以临时 `test-workspace-viewer` + 项目 `viewer` 账号分别访问 Deployment、StatefulSet、DaemonSet 原生详情页。三类页面均可读取并渲染资源状态、修改记录、元数据、环境变量、配置引用和事件入口，未显示编辑或更多操作入口。

同一浏览器会话中的 API 状态码为：

| 资源        | GET 详情 | POST 创建 | PUT 更新 | PATCH 更新 | DELETE 删除 |
| ----------- | -------: | --------: | -------: | ---------: | ----------: |
| Deployment  |      200 |       403 |      403 |        403 |         403 |
| StatefulSet |      200 |       403 |      403 |        403 |         403 |
| DaemonSet   |      200 |       403 |      403 |        403 |         403 |

临时 Workload 和账号绑定已清理。该证据关闭 A02～A04 当前项目 viewer 组合的读写拒绝子路径；operator/admin 正向操作的完整字段和错误态、低权限其他作用域、回滚/重新创建/删除、V3 Action 移除以及 `/consolev3/dashboard` 全局预加载仍未闭环。

## 2026-10-20 A02 原生 YAML 非法内容错误态补测

在 131 当前制品上创建临时 Deployment `v4-invalid-yaml-20261020`，通过真实浏览器打开原生“编辑 YAML”，使用文件导入提交缺少 `apiVersion`、`kind` 和 `metadata.name` 的非法 YAML。

- 点击确定后 Kubernetes API 返回 `400 BadRequest`。
- 页面显示 `BadRequest` 及“name must be provided”错误信息，编辑对话框保持打开，用户可以继续修正或取消。
- Kubernetes API 回读对象 generation 未变化，原对象没有被错误内容覆盖。
- 临时 Deployment 已删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。

该证据关闭 A02 的非法 YAML 错误反馈和不写入保护子路径。A03/A04 非法 YAML、resourceVersion 冲突、低权限错误态、完整操作组合和 V3/Wujie 清理仍未闭环。

## 2026-10-20 A02 原生 YAML resourceVersion 冲突保护补测

针对前一轮发现的资源版本保护缺口，已在提交 `4042f9570a8edf85e20ce43717c1cdf3b3a4f1bd` 中让 YAML 编辑提交保留编辑器打开时的 `metadata.resourceVersion`，避免提交前重新 GET 最新对象后静默覆盖并发变更。该变更新增 `preserveResourceVersion` 回归测试，并通过本地完整测试和构建。

本轮使用 GitHub Actions Run `39315775014` 构建并部署到 131：镜像 tag 为 `feature-v4-configmaps-secrets-20261020-040218-4042f9570a8e`，manifest digest 为 `sha256:1c59602033e75e14d60e769e1de25bf16db20e962a9d504ee40f991e5f879878`，Pod `ks-console-6f98cccdf7-jd5kz` 为 `Running/Ready`，实际 imageID 与该 digest 一致。

真实 Playwright 证据：打开临时 Deployment `v4-conflict-fix-20261020` 的原生 YAML 编辑器，外部将描述改为 `conflict-external-fix` 后，导入保存旧 `resourceVersion` 的 YAML 并提交；浏览器请求返回 `PUT 409 Conflict`，页面显示 Conflict 错误并保持编辑对话框，Kubernetes API 回读仍为 `conflict-external-fix`、generation 为 `2`，没有被旧内容覆盖。临时 Deployment 已删除。

该证据关闭 A02 的 resourceVersion 并发冲突保护子路径。A03/A04 尚未分别取得冲突证据，所有资源的完整操作组合、其他作用域 RBAC、V3 Action 移除和兼容残留清理仍未闭环；A02～A04 继续标记为“部分验证”。

## 2026-10-20 A03/A04 原生 YAML resourceVersion 冲突补测

在同一部署制品上，分别对临时 StatefulSet `v4-conflict-sts-20261020` 和 DaemonSet `v4-conflict-ds-20261020` 打开原生 YAML 编辑器。浏览器保持旧 YAML 后，外部 Kubernetes API 先修改描述，再通过文件导入提交旧 `resourceVersion`。

- StatefulSet：浏览器 `PUT` 返回 `409 Conflict`，API 回读外部描述 `conflict-external-sts`，generation 保持 `1`。
- DaemonSet：浏览器 `PUT` 返回 `409 Conflict`，API 回读外部描述 `conflict-external-ds`，generation 保持 `1`。
- 两个编辑对话框在冲突后均保持打开，页面未把旧 YAML 写回集群；临时对象已删除。

至此 A02～A04 三类 Workload 的 resourceVersion 并发冲突保护均有真实浏览器和 Kubernetes API 证据。该证据只关闭冲突保护子路径，完整字段、全部成功/失败/取消操作、其他作用域 RBAC、V3 Action 移除和兼容残留清理仍未闭环。

## 2026-10-20 A03/A04 原生 YAML 非法内容错误态补测

在当前 131 制品上，分别对临时 StatefulSet `v4-invalid-sts-20261020` 和 DaemonSet `v4-invalid-ds-20261020` 的原生 YAML 编辑器导入缺少 `apiVersion`、`kind` 和资源名称的非法 YAML。

- StatefulSet：浏览器 `PUT` 返回 `400 Bad Request`，编辑对话框保持打开，API 回读 `resourceVersion` 和 generation 均未改变。
- DaemonSet：浏览器 `PUT` 返回 `400 Bad Request`，编辑对话框保持打开，API 回读 `resourceVersion` 和 generation 均未改变。
- 两个临时 Workload 已删除，测试 namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。

该证据关闭 A03/A04 的非法 YAML 错误反馈和失败写入保护子路径；全部操作组合、其他作用域 RBAC、V3 Action 移除和兼容残留清理仍未闭环。

## 2026-10-20 A02/A03/A04 operator 正向 RBAC 补测

在 131 使用临时项目 operator 用户和真实 Playwright，对 Deployment、StatefulSet、DaemonSet 详情页及 API 进行正向验证。三类详情页均能渲染；同一浏览器会话中的 GET、PUT、PATCH、POST、DELETE 状态均分别为 `200/200/200/201/200`，并完成测试对象清理。

该证据补齐三类 Workload 当前项目 operator 的正向读写子路径，与已有 viewer 的 `GET 200、POST/PUT/PATCH/DELETE 403` 形成一组真实权限边界。A02～A04 的完整字段、错误态、所有作用域和 V3/Wujie 去依赖仍未闭环。

## 2026-10-20 A02 Workload 作用域边界补测

真实浏览器验证了两个作用域组合的 Deployment 详情和 API 边界：仅企业空间 viewer 的 `workspaceonly` 账号访问项目详情进入 `/errors/403`，GET/POST/PUT/PATCH/DELETE 均为 `403`；带企业空间 viewer 与集群 `cluster-viewer` 的 `clusterviewer` 账号页面正常渲染，GET 为 `200`、POST/PUT/PATCH/DELETE 均为 `403`。

该结果说明 Workload 的项目读取权限不能从其他资源模块矩阵直接推断。A02～A04 的 viewer/operator/workspaceonly/clusterviewer 作用域已有证据，但 projectonly、admin 独立组合以及全部 V3 Action 等价仍未闭环。

## 2026-10-20 A02 Workload projectonly 作用域补测

真实浏览器使用仅项目 `viewer` 绑定、没有企业空间成员绑定的临时账号访问 Deployment 详情：本轮页面正常渲染，项目 Deployment GET 为 `200`，POST 和 DELETE 均为 `403`。测试对象和账号已清理。

该结果补齐 A02 的 projectonly API 读写边界，同时记录页面结果与早期其他资源记录不同，不能将不同资源的 Console 路由权限行为互相推断。A02～A04 全部作用域统一矩阵、完整错误态和 V3 等价仍未完成。
