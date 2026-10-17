# P0 V3 模块源码行为证据

> 取证日期：2026-10-17（上海时间）
> 源码基线：`origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26`
> 许可证和版本：根 `package.json` 为 `AGPL-3.0`、`3.0.0`
> 用途：为 P0 迁移矩阵提供旧源码行为事实；不代表 V4 等价性或 P2-REA 通过。

## 1. ConfigMap

旧源码文件：

- `src/actions/configmap.js`
- `src/pages/projects/containers/ConfigMaps/index.jsx`
- `src/pages/clusters/containers/ConfigMaps/index.jsx`
- `src/configs/steps/configmaps.js`

已确认行为：

- `configmap.create` 根据 `MODULE_KIND_MAP` 和表单模板创建对象，项目/集群作用域传入 `cluster`、`namespace`；联邦场景会包装成多集群表单；
- 创建调用 `store.create`，编辑调用 `store.update`，编辑前保留 `metadata.resourceVersion`；
- 项目和集群列表提供基础信息编辑、YAML 编辑、ConfigMap 设置编辑和删除；
- `isFedManaged` 记录隐藏编辑/删除并禁用勾选；
- 创建表单至少包含基础信息和数据设置两个步骤。

## 2. Secret

旧源码文件：

- `src/actions/secret.js`
- `src/pages/projects/containers/Secrets/index.jsx`
- `src/pages/clusters/containers/Secrets/index.jsx`
- `src/configs/steps/secrets.js`

已确认行为：

- `secret.create` 支持项目/集群/联邦作用域；创建前会处理默认 Secret 逻辑，然后调用 `store.create`；
- `secret.edit` 会保留资源版本并调用 `store.update`；
- 集群列表还注册 `secret.default`，通过注解 `secret.kubesphere.io/is-default-class` 管理默认 Secret，并在切换默认值前清理旧默认项；
- 项目和集群列表提供基础信息编辑、YAML 编辑、Secret 设置编辑和删除；联邦管理记录隐藏编辑/删除并禁用勾选；
- Secret 数据的脱敏和编辑回显行为不能仅由上述 Action 源码确认，需要结合组件和运行时证据。

## 3. ServiceAccount

旧源码文件：

- `src/actions/serviceaccount.js`
- `src/pages/projects/containers/ServiceAccounts/index.jsx`
- `src/pages/projects/containers/ServiceAccounts/Detail/index.jsx`
- `src/pages/clusters/containers/ServiceAccounts/index.jsx`
- `src/configs/steps/serviceaccounts.js`

已确认行为：

- `serviceaccount.create` 调用 `store.create`；
- `serviceaccount.edit` 调用 `store.patch`；
- `serviceaccount.role.edit` 使用独立的角色修改弹窗并调用 `store.patch`；
- 项目和集群列表/详情提供编辑、YAML 编辑、角色修改和删除；
- 列表展示关联 Secret，详情展示 cluster、project、role 和创建时间；
- 联邦管理记录禁用勾选，详情对联邦管理记录不显示操作。

## 4. 与当前 V4 源码的静态对照

当前 V4 工作区已经存在以下对应入口：

| 资源 | V4 页面和 Store 候选 | 静态对照结论 |
| --- | --- | --- |
| ConfigMap | `packages/console/src/pages/projects/containers/ConfigMaps/`、`packages/shared/src/stores/configmap*` | 已有原生列表/详情/创建路径；仍需对照旧 YAML、设置、批量删除、历史和权限行为 |
| Secret | `packages/console/src/pages/projects/containers/Secrets/`、`packages/shared/src/stores/secret*` | 已有原生列表/详情/创建路径；默认 Secret、脱敏、编辑回显和跨作用域行为仍需逐项验证 |
| ServiceAccount | `packages/console/src/pages/projects/containers/ServiceAccounts/`、`packages/shared/src/stores/serviceAccounts.ts` | 已有原生列表/详情/创建路径；角色修改、关联 Secret、联邦限制和权限矩阵仍需逐项验证 |

此处只证明旧行为和当前源码入口可被定位，不能证明请求 method/path、RBAC、缓存失效、错误态和浏览器行为等价。对应证据必须进入 P2-REA 模块矩阵，并在 131 部署制品上验证。
