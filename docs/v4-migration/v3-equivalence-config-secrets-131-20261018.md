# ConfigMap、Secret、ServiceAccount V3 功能等价性逐项核对

> 核对日期：2026-10-18（上海时间）  
> V3 对照基线：`origin/release-3.4`  
> V3 源码提交：`175710fefeeba6ff295c2c0967b4d45b83563d26`  
> V4 运行时制品：`8c6262d97` / `sha256:bf6577ccdaddd314e478b4ba7235865e695a705c1f50cc7ec132152566b3652c`

本记录只覆盖 ConfigMap、Secret、ServiceAccount 模块及其通用资源操作。它不能替代全仓库 11 个业务 `useV3action` 调用点的全量等价性验收。

## 对照结果

| V3 Action/功能                              | V3 来源和行为                                                                                           | V4 当前替代                                                            | 131 运行时证据                                                              | 状态                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| `configmap.create`                          | `src/actions/configmap.js`；打开创建表单并调用 Store create                                             | 项目原生创建弹窗、当前 namespace POST、列表刷新                        | 原生创建、取消、namespace 锁定、RBAC 正反路径                               | 已验证                                 |
| `configmap.edit`                            | `src/actions/configmap.js`；配置数据编辑并携带 resourceVersion 更新                                     | 原生编辑设置和 YAML 编辑                                               | 数据编辑、有效 YAML 持久化、刷新后回显、PUT 权限边界                        | 已验证                                 |
| `secret.create`                             | `src/actions/secret.js`；创建前处理默认 Secret 状态后调用 Store create                                  | 原生创建弹窗和 Secret 脱敏数据模型                                     | 创建、掩码、缓存刷新、RBAC 正反路径                                         | 已验证基础创建；默认 Secret 语义未闭环 |
| `secret.edit`                               | `src/actions/secret.js`；Secret 设置编辑并处理默认状态                                                  | 原生编辑设置和脱敏 YAML 合并提交                                       | 编辑设置、脱敏 YAML 替换/新增键、刷新、PUT 权限边界                         | 已验证基础编辑；默认 Secret 语义未闭环 |
| `secret.default`                            | `src/actions/secret.js`；通过 `secret.kubesphere.io/is-default-class` 切换默认 Secret，并清理原默认对象 | 当前 V4 Secret 列表、详情和 Store 中未找到同等入口或 `setDefault` 实现 | 未找到可执行的 V4 入口，未伪造通过                                          | 未验证，存在功能缺口                   |
| `serviceaccount.create`                     | `src/actions/serviceaccount.js`；打开表单并调用 Store create                                            | 原生 ServiceAccount 创建弹窗                                           | 创建、namespace 锁定、无长期 Token Secret、RBAC 正反路径                    | 已验证                                 |
| `serviceaccount.edit`                       | `src/actions/serviceaccount.js`；通过 patch 修改允许字段                                                | 原生“编辑信息”和通用 YAML 操作                                         | 别名/描述写入、受保护字段保持、刷新、PUT/PATCH 权限边界                     | 已验证                                 |
| `serviceaccount.role.edit`                  | `src/actions/serviceaccount.js`；通过 patch 修改项目角色                                                | 原生“修改角色”弹窗                                                     | `viewer → operator` 提交、RoleBinding 复核、缓存作用域、角色 PATCH 正反路径 | 已验证                                 |
| `resource.baseinfo.edit`                    | `src/actions/resource.edit.js`；通用基础信息 Modal + Store patch                                        | `useCommonActions` + 原生详情操作                                      | ConfigMap、Secret、ServiceAccount 元数据/描述编辑和刷新                     | 已验证                                 |
| `resource.yaml.edit`                        | `src/actions/resource.edit.js`；通用 YAML Modal + Store update                                          | `useCommonActions` + 原生 YAML 编辑器；Secret 使用脱敏合并             | ConfigMap/Secret 有效 YAML 持久化、Secret 不回显数据、刷新复核              | 已验证                                 |
| `resource.delete` / `resource.batch.delete` | `src/actions/resource.delete.js`；确认后单项或批量删除                                                  | 原生删除确认框和批量操作                                               | 三个模块单项删除、ConfigMap/Secret 批量删除、NotFound/API 复核              | 已验证                                 |

## 已发现的未等价项

### Secret 默认对象语义

V3 的 `secret.default` 在 `origin/release-3.4:src/actions/secret.js` 和旧 Secret 页面中存在，依赖 `secret.kubesphere.io/is-default-class` 注解以及 Store 的 `setDefault`/`clearDefault`。当前 V4 Secret 页面没有对应 Action、按钮或 Store 方法，当前源码中也没有该注解处理路径。

因此不能把 Secret 的创建、编辑和脱敏验证扩展解释为 `secret.default` 已等价。该项需要产品负责人确认是否仍属于启用功能；若属于，必须补充 V4 原生入口、默认对象互斥清理、RBAC、缓存刷新和浏览器验证；若不属于，必须留下负责人确认的功能下线记录。

### 联邦 ConfigMap/Secret

旧 Action 支持 `isFederated` 表单和联邦对象；当前 `packages/console/src/pages/fedprojects/containers/ConfigMaps` 与 `Secrets` 仍存在 `consolev3` 路由/Embed。该范围不能纳入当前三个项目资源模块的“原生等价已验证”，需要单独完成 Federated REA、实现和 VERIFY。

## 当前结论

ConfigMap、Secret、ServiceAccount 的基础 CRUD、元数据、YAML、脱敏、ServiceAccount 角色和通用删除功能已经取得部署后浏览器/API 证据。`secret.default` 和联邦资源仍未等价，三个模块不能标记为“全部 V3 功能已验收”；扩展运行时错误按负责人指令继续延期。
