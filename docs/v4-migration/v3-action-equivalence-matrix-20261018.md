# 全部业务 V3 Action 逐项等价性跟踪矩阵

> 核对日期：2026-10-18（上海时间）  
> 当前分支：`feature/v4-configmaps-secrets`  
> 取证范围：当前源码、`origin/release-3.4` 旧源码和 131 已部署制品  
> 说明：静态映射不等于运行时等价；只有入口、Network、权限、成功/取消/失败和刷新证据齐全才可关闭。

## 业务调用点

| 编号 | 当前调用文件                                            | Action                        | 旧源码证据                                       | V4 替代/当前状态                                               | 运行时状态 |
| ---- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| A01  | `projects/components/ConfigReference/entry.tsx`         | `workload.template.edit`      | `src/actions/workload.js`                        | 已有原生 ConfigReference 编辑逻辑，但仍保留 V3 Action 兼容入口 | 未闭环     |
| A02  | `projects/.../Deployments/Detail/index.tsx`             | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 Deployment 详情仍通过 V3/Wujie 打开模板编辑               | 未等价     |
| A03  | `projects/.../StatefulSets/Detail/index.tsx`            | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 StatefulSet 详情仍通过 V3/Wujie 打开模板编辑              | 未等价     |
| A04  | `projects/.../DaemonSets/Detail/index.tsx`              | 默认 `workload.template.edit` | `src/actions/workload.js`                        | 项目 DaemonSet 详情仍通过 V3/Wujie 打开模板编辑                | 未等价     |
| A05  | `projects/.../Applications/.../OPAppTable/index.tsx`    | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，`release-3.4` 未直接匹配 | 当前仍由 V3 Action 打开边缘应用模板创建                        | 未验证     |
| A06  | `pages/workspaces/containers/Devops/index.tsx`          | `devops.edit`                 | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 编辑流程                        | 未验证     |
| A07  | `pages/workspaces/containers/Devops/index.tsx`          | `devops.create`               | `src/actions/devops.js`                          | 当前仍由 V3 Action 打开 DevOps 创建流程                        | 未验证     |
| A08  | `core/.../ProfileMenu/index.tsx`                        | `notification.user.setting`   | `release-3.4` 未直接匹配                         | 当前仍由 V3 Action 打开用户通知设置                            | 未验证     |
| A09  | `shared/components/Apps/AppCreate/index.tsx`            | `app.template.create.v2`      | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 打开应用模板创建                            | 未验证     |
| A10  | `shared/.../EdgeWorkloads/index.tsx`                    | `workload.batch.delete.v2`    | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 执行边缘工作负载批量删除                    | 未验证     |
| A11  | `shared/components/Apps/AppsDeploySpaceModal/index.tsx` | `batch.deploy.app.create.v2`  | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 调起部署弹窗，之后才调用 V4 `deployApp`     | 未验证     |
| A12  | `shared/components/Modals/AppTemplateEdit/index.tsx`    | `openpitrix.template.edit.v2` | 当前 `v3dist` 有字符串，旧源码未直接匹配         | 当前仍由 V3 Action 打开模板编辑                                | 未验证     |

A02～A04 和 A01 共涉及三类工作负载详情与配置引用；A05～A12 是独立业务入口。桥接实现和导出文件不重复计数，但删除桥接前必须关闭所有业务调用点。

## 已完成和未完成的边界

- ConfigMap、Secret、ServiceAccount 资源本身的 V3 Action 等价性已单独记录在[资源模块等价性记录](./v3-equivalence-config-secrets-131-20261018.md)。
- A02～A04 当前仍明确依赖 `useV3action` 和 `consoleV3Actions`，不能因为集群级 Workload 页面已有 V4 组件就宣布项目详情等价。
- A05～A12 目前只有静态调用、旧制品字符串或部分 V4 Store 证据，没有完整的 131 触发入口、Network、RBAC、失败和取消路径证据。
- 扩展初始化错误按负责人指令延期；延期不等同于这些 Action 已等价。
- 真实 API Server 故障验证另行记录，不能用 Playwright 路由拦截冒充集群故障。

## 下一步关闭条件

按 A01～A12 顺序逐项补齐：当前路由和入口、旧 V3 Store/API/权限、131 触发后的 Network、成功/取消/失败反馈、刷新/返回、V4 原生替代和低权限拒绝路径。每个 Action 关闭前不得删除对应 V3/Wujie 桥接代码。

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
