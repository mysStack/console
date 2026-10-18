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
