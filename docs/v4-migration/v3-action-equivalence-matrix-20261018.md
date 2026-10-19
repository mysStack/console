# 全部业务 V3 Action 逐项等价性跟踪矩阵

> 核对日期：2026-10-18（上海时间）  
> 当前分支：`feature/v4-configmaps-secrets`  
> 取证范围：当前源码、`origin/release-3.4` 旧源码和 131 已部署制品  
> 说明：静态映射不等于运行时等价；只有入口、Network、权限、成功/取消/失败和刷新证据齐全才可关闭。

## 业务调用点

| 编号 | 当前调用文件                                            | Action                        | 旧源码证据                                       | V4 替代/当前状态                                                                                                    | 运行时状态 |
| ---- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| A01  | `projects/components/ConfigReference/entry.tsx`         | `workload.template.edit`      | `src/actions/workload.js`                        | 已有原生 ConfigReference 编辑逻辑，但仍保留 V3 Action 兼容入口                                                      | 未闭环     |
| A02  | `projects/.../Deployments/Detail/index.tsx`             | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 Deployment 详情已切换到原生 Workload Detail；“编辑设置”改走原生 YAML 编辑器，完整字段等价和全局预加载仍待验证  | 部分验证   |
| A03  | `projects/.../StatefulSets/Detail/index.tsx`            | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 StatefulSet 详情已切换到原生 Workload Detail；“编辑设置”改走原生 YAML 编辑器，完整字段等价和全局预加载仍待验证 | 部分验证   |
| A04  | `projects/.../DaemonSets/Detail/index.tsx`              | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 DaemonSet 详情已切换到原生 Workload Detail；“编辑设置”改走原生 YAML 编辑器，完整字段等价和全局预加载仍待验证   | 部分验证   |
| A05  | `projects/.../Applications/.../OPAppTable/index.tsx`    | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，`release-3.4` 未直接匹配 | 当前仍由 V3 Action 打开边缘应用模板创建                                                                             | 未验证     |
| A06  | `pages/workspaces/containers/Devops/index.tsx`          | `devops.edit`                 | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 编辑流程                                                                             | 未验证     |
| A07  | `pages/workspaces/containers/Devops/index.tsx`          | `devops.create`               | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 创建流程                                                                             | 未验证     |
| A08  | `core/.../ProfileMenu/index.tsx`                        | `notification.user.setting`   | `release-3.4` 未直接匹配                         | 当前仍由 V3 Action 打开用户通知设置                                                                                 | 未验证     |
| A09  | `shared/components/Apps/AppCreate/index.tsx`            | `app.template.create.v2`      | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 已在项目应用页打开“从应用模板”并完成远程模板选择；完整 V4 替代、失败/取消和低权限仍待验证                           | 部分验证   |
| A10  | `shared/.../EdgeWorkloads/index.tsx`                    | `workload.batch.delete.v2`    | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 执行边缘工作负载批量删除                                                                         | 未验证     |
| A11  | `shared/components/Apps/AppsDeploySpaceModal/index.tsx` | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 已完成远程 Helm 模板选择、项目安装和 Application 创建；完整部署等价、失败/取消和低权限仍待验证                      | 部分验证   |
| A12  | `shared/components/Modals/AppTemplateEdit/index.tsx`    | `openpitrix.template.edit.v2` | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 编辑表单、字段回填、保存、删除和上传成功子路径已有运行时证据；冲突/失败、低权限和 V3 Action 移除仍未闭环            | 部分验证   |

A02～A04 和 A01 共涉及三类工作负载详情与配置引用；A05～A12 是独立业务入口。桥接实现和导出文件不重复计数，但删除桥接前必须关闭所有业务调用点。

## 已完成和未完成的边界

- ConfigMap、Secret、ServiceAccount 资源本身的 V3 Action 等价性已单独记录在[资源模块等价性记录](./v3-equivalence-config-secrets-131-20261018.md)。
- A02～A04 的项目详情入口已切换到原生 Workload Detail，源文件不再依赖 `useV3action`/`WujieReact`；“编辑设置”当前复用原生 YAML 编辑器。完整字段、成功/失败/取消和权限等价仍未关闭，应用启动层仍会预加载 `/consolev3/dashboard`。
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
